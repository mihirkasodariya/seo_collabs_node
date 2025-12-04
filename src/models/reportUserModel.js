import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const reportUserSchema = new Schema(
    {
        reportedBy: { type: Types.ObjectId, ref: dbTableName.AUTH, require: true },
        reportedUser: { type: Types.ObjectId, ref: dbTableName.AUTH, require: true },
        reason: {
            type: String,
            required: false,
            enum: [
                "abusive",
                "spam",
                "fake_profile",
                "fraud_exchange",
                "harassment",
                "other",
            ],
        },
        message: { type: String, required: false, default: "" },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);
export const reportUserModel = model(dbTableName.REPORT_USER, reportUserSchema);

export const reportUserValidation = Joi.object({
    reportedBy: Joi.string().required().messages({
        "string.empty": "reportedBy is required",
    }),
    reportedUser: Joi.string().required().messages({
        "string.empty": "reportedUser is required",
    }),
    reason: Joi.string().valid("abusive", "spam", "fake_profile", "fraud_exchange", "harassment", "other").required().messages({
        "any.only": "Invalid reason value",
        "string.empty": "reason is required",
    }),
    message: Joi.string().allow("").optional(),
    isActive: Joi.boolean().optional(),
});


export const idValidation = Joi.object({
    id: Joi.string().length(24).hex().required().messages({
        "string.base": "ID must be a string",
        "string.empty": "ID is required",
        "string.length": "ID must be exactly 24 characters",
        "string.hex": "ID must be a valid hexadecimal string",
        "any.required": "ID is required",
    }),
});