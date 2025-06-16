import express from "express";
import Message from "../models/Message.js";
import ActiveUser from "../models/ActiveUser.js";



//This is a controller because it only iteracts with the HTTP requests andinteracts with the CRUD operations

const JWT_SECRET = "secret";

const getRoomdata = async (req, res) => {
  const { room, username } = req.query;

  try {
    // Fetch messages and active users
    const messages = await Message.find({
      room,
      deletedForMe: { $nin: [username] },
    }).sort({ createdAt: 1 }).limit(50).exec();

    const activeUsersInRoom = await ActiveUser.find({ room }).exec();

    // Respond with messages and active users
    res.json({ Messages: messages, users: activeUsersInRoom });

  } catch (error) {
    console.error("Error in getRoomdata:", error);
    res.status(500).json({ message: "An internal server error occurred" });
  }
};

export default getRoomdata;