import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
import { MongoClient, ServerApiVersion } from "mongodb";
import mongoose from "mongoose";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import dotenv from "dotenv";
import { createAdapter } from "@socket.io/redis-adapter";
import { createClient } from "redis";
import { Clean_up } from "./Functions/Cleanup.js";
import chatRouter from "./routes/chatRouter.js";
import analyzeRouter from "./routes/analyzeRouter.js";
import handleSocketEvents from "./controllers/socketController.js";
import cookieParser from "cookie-parser";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);
const buildPath = join(__dirname, "..", "client", "dist");

export default async () => {
  const app = express();
  const server = http.createServer(app);

  // Redis setup
  const redisHost = process.env.REDIS_HOST;
  const redisPort = process.env.REDIS_PORT;
  const redisPassword = process.env.REDIS_PASSWORD;

  const io = new Server(server, {
    cors: {
      origin: ["https://devrooms-manit.netlify.app"],
      methods: ["*"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  const createRedisClient = () => {
    return createClient({
      socket: {
        host: redisHost,
        port: redisPort,
      },
      password: redisPassword,
    });
  };

  const pubClient = createRedisClient();
  const subClient = createRedisClient();

const handleRedisError = (client, error) => {
	console.error(`Redis client error: ${error}`);
	
	client.quit(); // Close the client connection
	setTimeout(() => {
		const newClient = createRedisClient(); // Create a new client
		newClient.on("error", (err) => handleRedisError(newClient, err)); // Handle errors for the new client
		newClient.on("connect", () => {
			console.log("Successfully reconnected to Redis");
			// Update the pubClient and subClient references
			pubClient = newClient;
			subClient = newClient;
			io.adapter(createAdapter(pubClient, subClient)); // Update the adapter with the new clients
		});
		newClient.connect(); // Connect to Redis
	}, 5000); // Retry after 5 seconds
};

  const connectRedis = async () => {
    try {
      pubClient.on("error", (err) => handleRedisError(pubClient, err));
      subClient.on("error", (err) => handleRedisError(subClient, err));

      await pubClient.connect();
      await subClient.connect();
      console.log("Successfully connected to Redis");

      pubClient.on("reconnecting", () =>
        console.log("Pub client reconnecting to Redis...")
      );
      subClient.on("reconnecting", () =>
        console.log("Sub client reconnecting to Redis...")
      );
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
      // Implement retry logic here instead of exiting
    }
  };

  await connectRedis();

  io.adapter(createAdapter(pubClient, subClient));

  // CORS and middleware setup
  app.use(
    cors({
      origin: ["https://devrooms-manit.netlify.app"],
      methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Cookie"],
      credentials: true,
    })
  );
  app.use(express.json());
  app.use(cookieParser());

  // MongoDB setup
  const uri = process.env.MONGO_DB_URI;
  const mongoClientOptions = {
    serverApi: {
      version: ServerApiVersion.v1,
      strict: true,
      deprecationErrors: true,
    },
    socketTimeoutMS: 45000,
    connectTimeoutMS: 45000,
    serverSelectionTimeoutMS: 45000,
  };

  const client = new MongoClient(uri, mongoClientOptions);

  const connectToMongo = async () => {
    try {
      await mongoose.connect(uri, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        socketTimeoutMS: 45000,
        connectTimeoutMS: 45000,
        serverSelectionTimeoutMS: 45000,
      });
      console.log("Mongoose connected to MongoDB");

      await client.connect();
      await client.db("admin").command({ ping: 1 });
      console.log("Pinged your deployment. MongoClient successfully connected to MongoDB!");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      setTimeout(connectToMongo, 5000); // Retry after 5 seconds
    }
  };

  await connectToMongo();

  // Routes
  app.use("/api", chatRouter);
  app.use("/analyze-api", analyzeRouter);
  app.use(express.static(buildPath));
  app.get("*", (req, res) => {
    res.sendFile(join(buildPath, "index.html"));
  });

  // Socket events
  //Passing the redis connection instance to the socket Controller to use it in the socket events to store the socketIDs
  handleSocketEvents(io,pubClient);

  // Cleanup
  setInterval(Clean_up, 15 * 60 * 1000);

  // Start server
  const port = process.env.PORT;
  server.listen(port);

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    server.close(() => {
      console.log("HTTP server closed.");
    });

    try {
      await client.close();
      console.log("MongoDB connection closed.");
      await mongoose.connection.close();
      console.log("Mongoose connection closed.");
      await pubClient.quit();
      await subClient.quit();
      console.log("Redis connections closed.");
      process.exit(0);
    } catch (err) {
      console.error("Error during graceful shutdown:", err);
      process.exit(1);
    }
  };

  // Handle various shutdown signals
  ["SIGINT", "SIGTERM", "SIGQUIT"].forEach((signal) => {
    process.on(signal, () => gracefulShutdown(signal));
  });

  process.on("uncaughtException", (err) => {
    console.error("Uncaught Exception:", err);
    gracefulShutdown("Uncaught Exception");
  });

  process.on("unhandledRejection", (reason, promise) => {
    console.error("Unhandled Rejection at:", promise, "reason:", reason);
    gracefulShutdown("Unhandled Rejection");
  });
};
