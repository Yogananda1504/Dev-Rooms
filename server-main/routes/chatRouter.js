import express from "express";
const router = express.Router();
import getRoomdata from "../controllers/chatController.js";
import {
	generateToken,
	verifyAccessToken,
	CrossValidateRefreshToken,
} from "../middleware/tokenUtils.js";
import cors from "cors";
import {
	verifyRefreshToken,
	generateAccessteToken,
} from "../middleware/tokenUtils.js";
import RefreshToken from "../models/RefreshToken.js";

let config = {
	origin: ["https://devrooms-manit.netlify.app"],
	methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
	allowedHeaders: ["Content-Type", "Authorization","Cookie"],
	credentials: true,
};

router.use(cors(config));
// Route for fetching messages and active users in a room
router.use(express.json());

//getRoomdata already has the verification process
router.get(
	"/chat/messages",
	CrossValidateRefreshToken,
	verifyAccessToken,
	getRoomdata
);
//Generation of Token endpoint
router.post("/generate-token", generateToken, (req, res) => {
	try {
		return res.status(200).json({ message: "Token generated successfully" });
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}
});
// Renew token endpoint
router.post(
	"/chat/renew-token",
	CrossValidateRefreshToken,
	verifyRefreshToken,
	generateAccessteToken,
	(req, res) => {
		try {
			return res.status(200).json({ message: "Token renewed successfully" });
		} catch (error) {
			return res.status(500).json({ error: error.message });
		}
	}
);

router.delete("/chat/logout", async (req, res) => {
    const refreshToken = req.cookies.refreshToken;

    if (!refreshToken) {
        console.error("Logging Out but no refresh token found");
        return res.status(401).json({ error: "No refresh token found" });
    }

    try {
        // Use await to find and delete the refresh token
        const doc = await RefreshToken.findOneAndDelete({ token: refreshToken });

        if (!doc) {
            return res.status(404).json({ error: "Refresh token not found in the database" });
        }

        // Clear the cookies after successfully deleting the token
        res.clearCookie("accessToken");
        res.clearCookie("refreshToken");
        return res.status(200).json({ message: "Logout successful" });
    } catch (err) {
        return res.status(500).json({ error: err.message });
    }
});

export default router;
