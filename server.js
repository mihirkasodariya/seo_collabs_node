// "use strict"

// import express, { json, urlencoded } from "express";
// import cors from "cors";
// import { join, dirname } from "path";
// import { fileURLToPath } from "url";
// import apiRouter from "./src/routes/index.js";
// import connectDB from "./db/dbconnect.js";

// const dotenv = await import("dotenv");
// dotenv.config({ quiet: true });

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const app = express();
// const port = process.env.PORT || 8001;

// connectDB();

// app.use(cors());
// app.use(json());
// app.use(urlencoded({ extended: true }));
// app.use(express.static(join(__dirname, "public")));


// app.use("/api", apiRouter);

// app.get('/sign-up', (req, res) => {
//   res.send(`<h1>Walcom Tech News</h1>`);
// });
// app.listen(port, "0.0.0.0", () => {
//   console.debug(`\x1b[32m✔ Server Started Successfully\x1b[0m \x1b[36m→ Now listening on Port: ${port}\x1b[0m`);
// });


import express, { json, urlencoded } from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import dotenv from "dotenv";

import connectDB from "./db/dbconnect.js";
import apiRouter from "./src/routes/index.js";
// import chatRoutes from "./src/routes/chatRoutes.js";
import { initChatSocket } from "./src/socket/chatSocket.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8001;

// 🧩 Middlewares
app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

// 📦 Routes
app.use("/api", apiRouter);
// app.use("/api/chat", chatRoutes);

// 🧠 Connect DB
connectDB();

// ⚡ Init Socket.IO chat
initChatSocket(server);

// ✅ Start server
server.listen(port, "0.0.0.0", () => {
  console.log(`✔ Server running on port ${port}`);
});


// "use strict";

// import express, { json, urlencoded } from "express";
// import cors from "cors";
// import { join, dirname } from "path";
// import { fileURLToPath } from "url";
// import apiRouter from "./src/routes/index.js";
// import connectDB from "./db/dbconnect.js";
// import http from "http";
// import { Server } from "socket.io";

// const dotenv = await import("dotenv");
// dotenv.config({ quiet: true });

// const __filename = fileURLToPath(import.meta.url);
// const __dirname = dirname(__filename);

// const app = express();
// const port = process.env.PORT || 8001;

// // CREATE HTTP SERVER
// const server = http.createServer(app);

// // INIT SOCKET.IO
// export const io = new Server(server, {
//   cors: {
//     origin: "http://localhost:1501", // frontend URL
//     methods: ["GET", "POST"],
//   },
// });

// // Track connected users
// const connectedUsers = new Map();

// io.on("connection", (socket) => {
//   console.log("User connected:", socket.id);

//   // Register user
//   socket.on("registerUser", (userId) => {
//     connectedUsers.set(userId, socket.id);
//     console.log("Registered user:", userId);
//   });

//   // Send message
//   socket.on("sendMessage", ({ senderId, receiverId, message }) => {
//     const receiverSocketId = connectedUsers.get(receiverId);

//     // Send to receiver if online
//     if (receiverSocketId) {
//       io.to(receiverSocketId).emit("receiveMessage", { senderId, message, createdAt: new Date() });
//     }

//     // Send ack to sender
//     socket.emit("messageSent", { receiverId, message, createdAt: new Date() });
//   });

//   socket.on("disconnect", () => {
//     console.log("User disconnected:", socket.id);
//     for (let [userId, id] of connectedUsers.entries()) {
//       if (id === socket.id) connectedUsers.delete(userId);
//     }
//   });
// });

// // CONNECT TO DATABASE
// connectDB();

// // MIDDLEWARE
// app.use(cors());
// app.use(json());
// app.use(urlencoded({ extended: true }));
// app.use(express.static(join(__dirname, "public")));

// // API ROUTES
// app.use("/api", apiRouter);

// // TEST ROUTE
// app.get("/sign-up", (req, res) => {
//   res.send(`<h1>Walcom Tech News</h1>`);
// });

// // ⚠️ IMPORTANT: Use server.listen, NOT app.listen
// server.listen(port, "0.0.0.0", () => {
//   console.debug(`\x1b[32m✔ Server Started Successfully\x1b[0m \x1b[36m→ Now listening on Port: ${port}\x1b[0m`);
// });
