import ActiveUser from "../models/ActiveUser.js";
import Rooms from "../models/Rooms.js";

// Generate a clean-up function which checks the active users and deletes the ones that have not been active for 15 or more minutes
export const Clean_up = async () => {
    try {
        console.log("Cleanup Function Running...");
        const currentTime = Date.now();

        // Find active users who have not been active for 15 or more minutes
        const inactiveUsers = await ActiveUser.find({
            lastActiveAt: { $lt: new Date(currentTime - 15 * 60 * 1000) }
        });

        // Log the inactive users
        console.log(`Found ${inactiveUsers.length} inactive users.`);

        // Delete inactive users
        const deletePromises = inactiveUsers.map(user => 
            ActiveUser.deleteOne({ _id: user._id })
        );
        await Promise.all(deletePromises);

        // Find rooms that have no active users
        const emptyRooms = await Rooms.find({ activeusers: 0 });

        // Log the empty rooms
        console.log(`Found ${emptyRooms.length} empty rooms.`);

        // Optionally, delete empty rooms if needed
        const deleteRoomPromises = emptyRooms.map(room => 
            Rooms.deleteOne({ name: room.name })
        );
        await Promise.all(deleteRoomPromises);

        console.log(`Removed ${inactiveUsers.length} inactive users and ${emptyRooms.length} empty rooms.`);
    } catch (error) {
        console.error("Error cleaning up active users and rooms:", error);
    }
};
