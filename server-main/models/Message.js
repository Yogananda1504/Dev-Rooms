import mongoose from "mongoose"; //// Define message model

const Message = mongoose.model("Message", {
	username: { type: String, required: true },
	message: { type: String, required: true },
	room: { type: String, required: true },
	deletedForEveryone: { type: Boolean, default: false },
	deletedForMe: [{ type: String, default: [] }],
	deletedBy: { type: String, default: null },
	createdAt: { type: Date, default: Date.now, expires: "2d" },
	edited: { type: Boolean, default: false },
	sentimentScore: {
		type: Number,
		default: 0,
	},
});

//Delete for me includes the user names for whom it is not rendered

export default Message;
