import Message from "../models/Message.js";
import ActiveUser from "../models/ActiveUser.js";
import Rooms from "../models/Rooms.js";
import mongoose from "mongoose";
import { analyzeMoodForUser } from "../Functions/Analyze_User.mjs";
import MoodData from "../models/Mood.js";

const handleSocketEvents = (io, redisClient) => {
  io.on("connection", async (socket) => {
    console.log("New client connected");

    // Helper function to store socket ID in Redis
    const storeSocketId = async (username, room, socketId) => {
      console.log("Updating the user activity ");
      console.log("Socket ID : ", socketId)
      const key = `${room}:${username}`;
      await redisClient.set(key, socketId);
      await redisClient.expire(key, 3600); // Expire after 1 hour
    };

    const MAX_RETRIES = 3;
    const RETRY_DELAY = 1000; // 1 second delay between retries

    // Helper function to retrieve socket ID from Redis
    const getSocketId = async (username, room) => {
      const key = `${room}:${username}`;
      return await redisClient.get(key);
    };

    // Helper function to remove socket ID from Redis
    const removeSocketId = async (username, room) => {
      const key = `${room}:${username}`;
      await redisClient.del(key);
    };

    const updateUserActivity = async (username, room) => {
      await ActiveUser.findOneAndUpdate(
        { username, room },
        { lastActiveAt: Date.now() },
        { upsert: true }
      );
      // Update socket ID in Redis
      await storeSocketId(username, room, socket.id);
    };

    const emitActiveUsers = async (room) => {
      const activeUsersInRoom = await ActiveUser.find({ room });
      io.to(room).emit("chatroom_users", activeUsersInRoom);
    };

    const handleUserLeave = async (username, room) => {
      let retries = 0;
      while (retries < MAX_RETRIES) {
        const session = await mongoose.startSession();
        session.startTransaction();

        try {
          // Delete the user from the ActiveUser collection
          await ActiveUser.deleteOne({ username, room }, { session });

          // Delete mood data associated with the user
          await MoodData.deleteOne({ username, room }, { session });

          // Remove socket ID from Redis
          await removeSocketId(username, room);

          // Decrement the active user count and check if it's zero in one atomic operation
          const result = await Rooms.findOneAndUpdate(
            { name: room },
            { $inc: { activeusers: -1 } },
            { new: true, session }
          );

          if (result && result.activeusers <= 0) {
            // Delete the room if active users is zero or less
            await Rooms.deleteOne({ name: room }, { session });
          }

          await session.commitTransaction();

          // Notify the room that the user has left
          io.to(room).emit("left_room", {
            username: "Admin",
            message: `${username} has left the room`,
          });

          // Update the list of active users in the room
          await emitActiveUsers(room);

          console.log(`User ${username} successfully left room ${room}`);
          return; // Success, exit the function

        } catch (error) {
          await session.abortTransaction();

          if (error.code === 112 && retries < MAX_RETRIES - 1) {
            retries++;
            console.log(`Retrying operation (${retries}/${MAX_RETRIES})...`);
            await new Promise(resolve => setTimeout(resolve, RETRY_DELAY));
          } else {
            console.error("Error handling user leave:", error);
            throw error; // Rethrow the error if max retries reached or it's not a WriteConflict
          }
        } finally {
          session.endSession();
        }
      }
    };

    socket.on("remove_user_by_admin", async ({ username, room }) => {
      try {
        console.log("Removing the user by admin:", username);
      // Remove the user from the admin list
      await Rooms.findOneAndUpdate({ name: room }, { $pull: { admin: username } });
      
      const socketId = await getSocketId(username, room);
      console.log(socketId)
      
      await io.to(socketId).emit("user_removed_by_admin");
     

      await handleUserLeave(username, room);
       // Update the list of active users in the room
       await emitActiveUsers(room);

      

      // Disconnect the socket connection
      io.sockets.sockets.get(socketId)?.disconnect();
      } catch (error) {
      console.error("Error removing user by admin:", error);
      }
    });
     socket.on("check",()=>{
      console.log("Remove user event received on frontend");
     });
    socket.on("make_admin", async ({ username, room }) => {
      try {
        console.log("Making user admin:", username);
        const roomData = await Rooms.findOne({ name: room });
        if (!roomData) {
          console.log(`Room not found: ${room}`);
          socket.emit("admin_status", { isAdmin: false });
          return;
        }
        const updatedAdmin = [...roomData.admin, username];
        await Rooms.findOneAndUpdate({ name: room }, { admin: updatedAdmin });

        const socketId = await getSocketId(username, room); // Await the result of getSocketId
        console.log(`User ${username} is now an admin in room ${room}`, socketId);
        io.to(socketId).emit("admin_status", { username: username, isAdmin: true });
      } catch (error) {
        console.error("Error making user admin:", error);
        socket.emit("admin_status", { isAdmin: false });
      }
    });

    socket.on('check_admin_status', async ({ username, room }, callback) => {
      try {
        const roomData = await Rooms.findOne({ name: room });
        if (!roomData) {
          console.log(`Room not found: ${room}`);
          return callback({ isAdmin: false });
        }
        const isAdmin = roomData.admin.includes(username);
        console.log(`Checking admin status for ${username} in room ${room}: ${isAdmin}`);
        callback({ isAdmin });
      } catch (error) {
        console.error("Error checking admin status:", error);
        callback({ isAdmin: false });
      }
    });

    socket.on('toggle_room_lock', async ({ room, locked }) => {
      try {
        await Rooms.findOneAndUpdate({ name: room }, { locked });
        io.to(room).emit('room_lock_status', { locked });
      } catch (error) {
        console.error('Error toggling room lock:', error);
      }
    });

    socket.on('check_room_lock', async (room) => {
      try {
        const roomData = await Rooms.findOne({ name: room });
        socket.emit('room_lock_status', { locked: roomData ? roomData.locked : false });
      } catch (error) {
        console.error('Error checking room lock status:', error);
        socket.emit('room_lock_status', { locked: false });
      }
    });

    socket.on("check_room_exists", async (room) => {
      try {
        const roomExists = await Rooms.exists({ name: room });
        socket.emit("room_exists", !!roomExists);
      } catch (error) {
        console.error("Error checking if room exists:", error);
        socket.emit("room_exists", false);
      }
    });

    socket.on("ping", () => {
      socket.emit("pong");
    });

    socket.on("join", async ({ username, room }) => {
      try {
        socket.join(room);
        await updateUserActivity(username, room);
      } catch (error) {
        console.error("Error joining room while refreshing:", error);
      }
    });

    socket.on("check_username", async ({ username, room }) => {
      try {
        await Rooms.findOneAndUpdate({ name: room }, {}, { upsert: true });
        const userExists = await ActiveUser.exists({ username, room });
        socket.emit("username_taken", !!userExists);
      } catch (error) {
        console.error("Error checking username:", error);
      }
    });

    socket.on("create_room", async ({ username, room, roomCapacity }) => {
      try {
        const newRoom = await Rooms.create({
          name: room,
          capacity: roomCapacity,
          admin: [username],
          activeusers: 0,
        });
        socket.emit("room_created", { room: newRoom.name });
      } catch (error) {
        console.error("Error creating room:", error);
        socket.emit("room_creation_error", { message: "Failed to create room" });
      }
    });

    socket.on("join_room", async ({ username, room }) => {
      console.log(`Attempting to join room: ${room} for user: ${username}`);
      try {
        const roomData = await Rooms.findOne({ name: room });
        if (!roomData) {
          console.log(`Room not found: ${room}`);
          socket.emit("room_error", { message: "Room does not exist" });
          return;
        }

        console.log(`Room ${room}: capacity ${roomData.capacity}, active users ${roomData.activeusers}`);

        if (roomData.locked) {
          console.log(`Room ${room} is locked`);
          socket.emit("room_locked", { message: "Room is locked" });
          return;
        }

        if (roomData.activeusers >= roomData.capacity) {
          console.log(`Room ${room} is full. Capacity: ${roomData.capacity}, Active users: ${roomData.activeusers}`);
          socket.emit("room_full", { message: "Room is full" });
          return;
        }

        const updatedRoom = await Rooms.findOneAndUpdate(
          { name: room, activeusers: { $lt: roomData.capacity } },
          { $inc: { activeusers: 1 } },
          { new: true }
        );

        if (!updatedRoom) {
          console.log(`Failed to update room ${room}. It might be full.`);
          socket.emit("room_full", { message: "Room is full" });
          return;
        }

        console.log(`User ${username} successfully joined room ${room}. New active users count: ${updatedRoom.activeusers}`);

        socket.join(room);

        // Store socket ID in Redis
        await storeSocketId(username, room, socket.id);

        const now = new Date();
        const newUser = await ActiveUser.create({
          username,
          room,
          lastActiveAt: now,
          createdAt: now,
        });
        await newUser.save();

        socket.emit("welcome_message", {
          username: "Admin",
          message: `Welcome ${username} to the room ${room}`,
          id: "-1",
        });

        socket.to(room).emit("system_message", {
          username: "Admin",
          message: `${username} has joined the room`,
          id: "-1",
        });

        await emitActiveUsers(room);

      } catch (error) {
        console.error("Error joining room:", error);
        socket.emit("join_error", { message: "Error joining room" });
      }
    });

    socket.on("edit_message", async ({ username, room, messageId, newMessage }) => {
      try {
        const moodData = await analyzeMoodForUser(newMessage, username, room);

        const updatedMessage = await Message.findOneAndUpdate(
          { _id: messageId, username, room },
          {
            message: newMessage,
            edited: true,
            sentimentScore: moodData.sentimentScore,
          },
          { new: true }
        );

        if (updatedMessage) {
          await ActiveUser.findOneAndUpdate(
            { username, room },
            {
              $set: {
                lastActiveAt: new Date(),
                mood: moodData.overallMood,
                sentimentScore: moodData.sentimentScore,
              },
            },
            { new: true, upsert: true }
          );

          io.to(room).emit("update_edited_message", {
            messageId,
            updatedMessage: updatedMessage.message,
            sentimentScore: moodData.sentimentScore,
          });

          socket.emit("mood_update", {
            messageId,
            detailedMood: {
              overallMood: moodData.overallMood,
              sentimentScore: moodData.sentimentScore,
              emotionScores: moodData.emotionScores,
              topEmotions: moodData.topEmotions,
              moodDescription: moodData.moodDescription,
            },
          });
        }
      } catch (error) {
        console.error("Error editing message:", error);
        socket.emit("edit_error", { error: "Failed to edit message" });
      }
    });

    socket.on("send_message", async ({ username, message, room }, callback) => {
      const start = performance.now();
      try {
        const moodData = await analyzeMoodForUser(message, username, room);

        const newMessage = await Message.create({
          username,
          message,
          room,
          sentimentScore: moodData.sentimentScore,
        });

        await ActiveUser.findOneAndUpdate(
          { username, room },
          {
            $set: {
              lastActiveAt: new Date(),
              mood: moodData.overallMood,
              sentimentScore: moodData.sentimentScore,
            },
          },
          { new: true, upsert: true }
        );

        io.to(room).emit("receive_message", {
          username,
          message,
          _id: newMessage._id.toString(),
          sentimentScore: moodData.sentimentScore,
        });

        if (callback) {
          callback(null, {
            id: newMessage._id.toString(),
            message,
            sentimentScore: moodData.sentimentScore,
            detailedMood: {
              overallMood: moodData.overallMood,
              sentimentScore: moodData.sentimentScore,
              emotionScores: moodData.emotionScores,
              topEmotions: moodData.topEmotions,
              moodDescription: moodData.moodDescription,
            },
          });
        }

        const end = performance.now();
        const duration = end - start;
        console.log(
          `Message processing took ${duration.toFixed(
            2
          )}ms for user ${username} in room ${room}`
        );

        if (duration > 1000) {
          console.warn(
            `Message processing exceeded 1000ms (${duration.toFixed(
              2
            )}ms) for user ${username} in room ${room}`
          );
        }
      } catch (error) {
        console.error("Error sending message:", error);
        if (callback) callback(error.message);
      }
    });

    socket.on("delete_for_me", async ({ username, room, messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          { $addToSet: { deletedForMe: username } }
        );
        await updateUserActivity(username, room);
      } catch (error) {
        console.error("Error marking messages for deletion:", error);
      }
    });

    socket.on("delete_for_everyone", async ({ username, room, messageIds }) => {
      try {
        await Message.updateMany(
          { _id: { $in: messageIds } },
          {
            message: "This message was deleted",
            deletedForEveryone: true,
            deletedBy: username,
          }
        );
        await updateUserActivity(username, room);
        io.to(room).emit("messages_deleted", { messageIds, username });
      } catch (error) {
        console.error("Error marking messages for deletion:", error);
      }
    });

    socket.on("disconnect", async () => {
      try {
        const user = await ActiveUser.findOneAndDelete({ socketId: socket.id });

        if (user) {
          const { username, room } = user;
          await removeSocketId(username, room);
          socket.to(room).emit("left_room", {
            username: "Admin",
            message: `${username} has left the room`,
          });
          await emitActiveUsers(room);
        }
      } catch (error) {
        console.error("Error disconnecting:", error);
      }
    });

    socket.on("leave_room", async ({ username, room }) => {
      try {
        await handleUserLeave(username, room);
        socket.disconnect();
      } catch (error) {
        console.error("Error leaving room:", error);
      }
    });

    socket.on("remove_user", async ({ username, room }) => {
      try {
        await handleUserLeave(username, room);
        socket.disconnect();
      } catch (error) {
        console.error("Error removing user:", error);
      }
    });

    ["error", "connect_error", "connect_timeout", "reconnect_error"].forEach(
      (event) => {
        socket.on(event, (error) => console.error(`Socket ${event}:`, error));
      }
    );

    socket.on("reconnect", async () => {
      console.log("Client reconnected:", socket.id);
      // Update the socket ID in Redis for the reconnected user
      // This assumes you have a way to identify the user and room on reconnection
      // You might need to implement a custom reconnection logic that includes this information
      // const { username, room } = getReconnectionInfo(socket);
      // if (username && room) {
      //   await storeSocketId(username, room, socket.id);
      // }
    });
  });
};

export default handleSocketEvents;