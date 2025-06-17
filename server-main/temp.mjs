import express from "express";
import http from "http";
import cors from "cors";
import { Server } from "socket.io";
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

// Constants
const TIMEOUT_CONFIG = {
  socketTimeoutMS: 45000,
  connectTimeoutMS: 45000,
  serverSelectionTimeoutMS: 45000,
};

const CORS_CONFIG = {
  origin: ["https://devrooms-manit.netlify.app"],
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Cookie"],
  credentials: true,
};

export default async () => {
  const app = express();
  const server = http.createServer(app);

  // Redis setup
  const redisConfig = {
    socket: {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
    },
    password: process.env.REDIS_PASSWORD,
  };

  const io = new Server(server, {
    cors: {
      origin: CORS_CONFIG.origin,
      methods: ["*"],
    },
    pingTimeout: 60000,
    pingInterval: 25000,
  });

  let pubClient = createClient(redisConfig);
  let subClient = createClient(redisConfig);

  const handleRedisError = (error, clientType) => {
    console.error(`Redis ${clientType} client error: ${error}`);
    
    setTimeout(async () => {
      try {
        const newPubClient = createClient(redisConfig);
        const newSubClient = createClient(redisConfig);
        
        newPubClient.on("error", (err) => handleRedisError(err, "pub"));
        newSubClient.on("error", (err) => handleRedisError(err, "sub"));
        
        await newPubClient.connect();
        await newSubClient.connect();
        
        pubClient = newPubClient;
        subClient = newSubClient;
        
        io.adapter(createAdapter(pubClient, subClient));
        console.log("Successfully reconnected to Redis");
      } catch (reconnectError) {
        console.error("Failed to reconnect to Redis:", reconnectError);
      }
    }, 5000);
  };

  const connectRedis = async () => {
    try {
      pubClient.on("error", (err) => handleRedisError(err, "pub"));
      subClient.on("error", (err) => handleRedisError(err, "sub"));

      await pubClient.connect();
      await subClient.connect();
      console.log("Successfully connected to Redis");

      pubClient.on("reconnecting", () => console.log("Pub client reconnecting to Redis..."));
      subClient.on("reconnecting", () => console.log("Sub client reconnecting to Redis..."));
    } catch (error) {
      console.error("Failed to connect to Redis:", error);
    }
  };

  //It will deal the connection of the pub & sub clients to the redis server inter server instance communications 
  //After that we configure them to the io server's adapter . Pub will be used for the broadcasting and sub for the sake of listening to this
  await connectRedis();
  io.adapter(createAdapter(pubClient, subClient));

  // Middleware setup
  app.use(cors(CORS_CONFIG));
  app.use(express.json());
  app.use(cookieParser());

  // MongoDB setup with mongoose only
  const connectToMongo = async () => {
    try {
      await mongoose.connect(process.env.MONGO_DB_URI, {
        useNewUrlParser: true,
        useUnifiedTopology: true,
        ...TIMEOUT_CONFIG,
      });
      console.log("Successfully connected to MongoDB");
    } catch (error) {
      console.error("Failed to connect to MongoDB:", error);
      setTimeout(connectToMongo, 5000);
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
  handleSocketEvents(io, pubClient);

  // Cleanup
  setInterval(Clean_up, 15 * 60 * 1000);

  // Start server
  server.listen(process.env.PORT);

  // Graceful shutdown
  const gracefulShutdown = async (signal) => {
    console.log(`${signal} received. Shutting down gracefully...`);
    
    server.close(() => console.log("HTTP server closed."));

    try {
      await mongoose.connection.close();
      console.log("MongoDB connection closed.");
      
      await Promise.all([pubClient.quit(), subClient.quit()]);
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
      
