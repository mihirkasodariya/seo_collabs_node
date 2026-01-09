import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const otpRegisterSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: dbTableName.AUTH, require: false },
        websiteUrl: { type: String, require: false },
        email: { type: String, require: false },
        otp: { type: String, require: true },
        otpExpires: { type: Date, require: true },
    },
    { timestamps: true }
);
export const otpModel = model(dbTableName.TEMP_OTP, otpRegisterSchema);

export const verifyOtpValidation = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Enter a valid email address",
        "any.required": "Email is required",
    }),
    otp: Joi.string().length(6).required().messages({
        "string.empty": "OTP is required",
        "string.length": "OTP must be 6 digits",
        "any.required": "OTP is required",
    }),
});

export const emailValidation = Joi.object({
    email: Joi.string().email().required().messages({
        "string.empty": "Email is required",
        "string.email": "Enter a valid email address",
        "any.required": "Email is required",
    }),
});