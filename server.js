import express, { json, urlencoded } from "express";
import cors from "cors";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import http from "http";
import dotenv from "dotenv";

import connectDB from "./db/dbconnect.js";
import apiRouter from "./src/routes/index.js";
import { initChatSocket } from "./src/socket/chatSocket.js";

dotenv.config();
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const server = http.createServer(app);
const port = process.env.PORT || 8001;
app.use((req, res, next) => {
  res.header("Access-Control-Expose-Headers", "x-user-id");
  next();
});

app.use(cors());
app.use(json());
app.use(urlencoded({ extended: true }));
app.use(express.static(join(__dirname, "public")));

app.use("/api", apiRouter);

connectDB();

initChatSocket(server);

server.listen(port, "0.0.0.0", () => {
  console.log(`✔ Server running on port ${port}`);
});