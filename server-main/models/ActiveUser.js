import mongoose from "mongoose"; //// Define message model

const ActiveUser = mongoose.model("ActiveUser", {
	username: { type: String, required: true },
	room: { type: String, required: true },
	sentimentScore: { type: Number, default: 0 },
	mood: { type: String, default: "neutral" },
	lastActiveAt: { type: Date, default: Date.now },
	createdAt: { type: Date, default: Date.now, expires: "2d" },
});

export default ActiveUser;
