
import mongoose, { model } from "mongoose";
const { Schema } = mongoose;
import { dbTableName } from "../utils/constants.js";

const activitySchema = new Schema(
    {
        userId: { type: Schema.Types.ObjectId, ref: dbTableName.AUTH, required: true },
        type: {
            type: String,
            enum: [
                "WEBSITE_ADD",
                "MESSAGE_RECEIVED",
                "EXCHANGE_CREATED",
                "EXCHANGE_STATUS",
            ],
            required: true,
        },
        title: { type: String, required: true },
    },
    { timestamps: true }
);
export const activityModel = model(dbTableName.ACTIVITY, activitySchema);
