// chatSocket.js
import { Server } from "socket.io";
import { saveMessage } from "../controllers/chatController.js";
import { messageModel } from "../models/chatModel.js";

const connectedUsers = new Map();

export const initChatSocket = (server) => {
    const io = new Server(server, {
        cors: {
            origin: process.env.FRONTEND_BASE_URL, // your frontend URL
            methods: ["GET", "POST"],
        },
    });

    io.on("connection", (socket) => {
        console.log("🔌 User connected:", socket.id);

        // 🧩 Register User
        socket.on("registerUser", (userId) => {
            connectedUsers.set(userId, socket.id);
            console.log("✅ Registered user:", userId);
        });

        // ✉️ Send Message
        socket.on("sendMessage", async ({ senderId, receiverId, message, fileName, fileType, fileUrl }) => {
            try {
                const newMsg = await saveMessage(senderId, receiverId, message, false, fileName, fileType, fileUrl);
                console.log("💾 Message saved:", newMsg);

                // Send to receiver (if online)
                const receiverSocketId = connectedUsers.get(receiverId);
                if (receiverSocketId) {
                    io.to(receiverSocketId).emit("receiveMessage", newMsg);
                }

                // Send confirmation to sender
                socket.emit("messageSent", newMsg);
            } catch (err) {
                console.error("❌ Error saving message:", err);
            }
        });

        // 👁️ Mark messages as seen
        socket.on("markSeen", async ({ userId, partnerId }) => {
            try {
                await messageModel.updateMany(
                    { receiverId: userId, senderId: partnerId, seen: false },
                    { $set: { seen: true } }
                );
                const senderSocket = connectedUsers.get(partnerId);
                if (senderSocket) {
                    io.to(senderSocket).emit("messageSeen", { userId, partnerId });
                }
            } catch (err) {
                console.error("❌ Error marking seen:", err);
            }
        });

        // ❌ On disconnect
        socket.on("disconnect", () => {
            console.log("❌ Disconnected:", socket.id);
            for (let [userId, id] of connectedUsers.entries()) {
                if (id === socket.id) connectedUsers.delete(userId);
            }
        });
    });

    return io;
};
