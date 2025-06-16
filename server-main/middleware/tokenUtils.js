import jwt from "jsonwebtoken";
import RefreshToken from "../models/RefreshToken.js";
import dotenv from "dotenv";

dotenv.config();
const JWT_SECRET=process.env.JWT_SECRET;

export const generateToken = async (req, res, next) => {
	try {
		const payload = {
			username: req.query.username || req.params.username,
			room: req.query.room || req.params.room,
		};

		if (!payload.username || !payload.room) {
			return res.status(401).json({ message: "Invalid user or room" });
		}

		const accessToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "14m" });
		const refreshToken = jwt.sign(payload, JWT_SECRET, { expiresIn: "7d" });
		const tokens = { accessToken, refreshToken };

		// Set access token cookie
		//httpOnly: true means that the cookie cannot be accessed by JavaScript .Which will also make it secure by not allowing any modification from the frontend side
		//maxAge: 14 * 60 * 1000 means that the cookie will expire after 14 minutes
		//path: "/" means that the cookie is available for all paths
		//secure: true means that the cookie is only sent over HTTPS
		//sameSite: "strict" means that the cookie is only sent in a first-party context
		res.cookie("accessToken", accessToken, {
			httpOnly: true,
			maxAge: 20 * 60 * 1000, // 15 minutes
			secure: true,
			path: "/", // Ensure the cookie is available for all paths
			sameSite: "none",
		});

		// Set refresh token cookie
		res.cookie("refreshToken", refreshToken, {
			httpOnly: true,
			maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
			secure: true,
			path: "/", 
			sameSite: "none",
		});
		// Save the Refresh Token in the MongoDB database

		const refreshTokenDoc = new RefreshToken({ token: refreshToken });
		await refreshTokenDoc.save();

		console.log("Tokens generated:", tokens);
		console.log("Cookies set:", res.getHeaders()["set-cookie"]);

		// Send a response to confirm token generation
		res.status(200).json({ message: "Tokens generated successfully" });

		// next() is not called here as we're ending the request with a response
	} catch (error) {
		console.error("Failed to generate token:", error);
		return res.status(500).json({ error: error.message });
	}
};

export const verifyAccessToken = async (req, res, next) => {
	// Getting the access token from the request cookies
	const accessToken = req.cookies.accessToken;

	if (!accessToken) {
		return res.status(401).json({ message: "No Token" });
	}

	try {
		const decodedToken = jwt.verify(accessToken, JWT_SECRET);
		if (!decodedToken) {
			return res.status(401).json({ message: "Invalid Token" });
		}

		const tokenRoom = decodedToken.room;
		const flag = req.query.flag;
		const { username, room } = req.query || req.params;

		if (flag !== "ok" || flag === undefined) {
			// First, check if the user is authenticated
			if (decodedToken.username !== username) {
				return res.status(401).json({ message: "Unauthorized: Invalid user" });
			}

			// Then, check if the user has access to the requested room
			if (tokenRoom !== room) {
				return res
					.status(403)
					.json({ message: "Forbidden: You don't have access to this room" });
			}

			// If everything is ok then call the next function in the middleware chain or the controller
			next();
		} else {
			// The flag will be set to ok if the user is accessing the analyzeAPI for suggestions
			const decodedToken = jwt.verify(accessToken, JWT_SECRET);
			if (!decodedToken) {
				return res.status(401).json({ message: "Invalid Token" });
			}
			next();
		}
	} catch (error) {
		return res.status(401).json({ message: "Failed to authenticate token" });
	}
};

export const CrossValidateRefreshToken = async (req, res, next) => {
	//If the request token is not present in the MongoDB database then it means that the RefreshToken is non genuine
	const refreshToken = req.cookies.refreshToken;
	if (!refreshToken) {
		return res.status(401).json({ message: "No Token Found" });
	}
	try {
		const token = await RefreshToken.findOne({ token: refreshToken });
		if (!token) {
			return res.status(401).json({ message: "Invalid Refresh Token" });
		}
	} catch (error) {
		return res.status(500).json({ error: error.message });
	}

	next();
};

export const verifyRefreshToken = async (req, res, next) => {
	const { room, username } = req.query || req.params;
	const refreshToken = req.cookies.refreshToken;

	if (!username || !room) {
		console.log("Invalid username or room while verifying refresh token");
		return res.status(401).json({ message: "Invalid user or room" });
	}

	if (!refreshToken) {
		console.log("Token Not Found while verifying refresh token");
		return res.status(401).json({ message: " Token Not Found" });
	}
	try {
		const decodedToken = jwt.verify(refreshToken, JWT_SECRET);
		//If the token is invalid then set the status to 401 and return the repsonse
		if (!decodedToken) {
			console.log("Invalid Token while verifying refresh token");
			return res.status(401).json({ message: "Invalid Token" });
		}
		if (decodedToken.username !== username || decodedToken.room !== room) {
			console.log("Invalid Username or Room while verifying refresh token");
			return res.status(403).json({ message: "Invalid Username or Room" });
		}
		if (decodedToken.room !== room) {
			console.log("Invalid Room while verifying refresh token");
			return res.status(403).json({ message: "Invalid Username or Room" });
		}

		//If everything is ok then attach the user to the request object
		req.user = decodedToken;
		next();
	} catch (error) {}
};

export const generateAccessteToken = async (req, res, next) => {
	const { username, room } = req.user;
	if (!username || !room) {
		return res.status(401).json({ message: "Invalid user or room" });
	}
	//Remove the previous token from the cookies
	res.clearCookie("accesstoken");

	//Generate a new token with the same payload
	const acessToken = jwt.sign({ username, room }, JWT_SECRET, {
		expiresIn: "14m",
	});
	//Set the previous cookie with the newlyGenerated cookie
	res.cookie("accessToken", acessToken, {
		httpOnly: true,
		secure: true,
		sameSite: "strict",
		maxAge: 15 * 60 * 1000,
		path: "/",
	});
	//You have renewed the tokens properly until now
	next();
};
