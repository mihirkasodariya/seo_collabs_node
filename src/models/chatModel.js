import mongoose, { model } from "mongoose";
import { dbTableName } from "../utils/constants.js";

const messageSchema = new mongoose.Schema(
    {
        senderId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: dbTableName.AUTH,
            required: true,
        },
        receiverId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: dbTableName.AUTH,
            required: false,
        },
        message: {
            type: String,
            required: false,
        },
        fileUrl: { type: String },
        fileType: { type: String },
        fileName: { type: String },
        seen: {
            type: Boolean,
            default: false,
        },
    },
    { timestamps: true }
);

export const messageModel = model(dbTableName.CHAT, messageSchema);
