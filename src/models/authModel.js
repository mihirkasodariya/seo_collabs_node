import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const authRegisterSchema = new Schema(
    {
        name: { type: String, required: true },
        email: { type: String, required: true },
        img: { type: String, required: false, default: "" },
        bio: { type: String, required: false, default: "" },
        password: { type: String, require: true },
        role: { type: Number, default: 1 }, // Role identifier: 1 -> User, 0 -> Admin (default: User)
        country: { type: String, require: true },
        isSubscription: { type: Boolean, default: false },
        isVerified: { type: Boolean, default: false },
        referredBy: { type: Types.ObjectId, ref: dbTableName.AUTH, default: null, },
        referralStats: {
            total: { type: Number, default: 0 },
            pending: { type: Number, default: 0 },
            successful: { type: Number, default: 0 },
        },
        blocksList: [
            {
                type: Types.ObjectId,
                ref: dbTableName.AUTH,
            }
        ],

        blockedBy: [
            {
                type: Types.ObjectId,
                ref: dbTableName.AUTH,
            }
        ],
        isReportUser: { type: Boolean, default: false },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);
export const authModel = model(dbTableName.AUTH, authRegisterSchema);

export const loginValidation = Joi.object({
    email: Joi.string().email().trim().lowercase().required().messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).max(30).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 6 characters",
        "any.required": "Password is required",
    }),
});

export const authValidation = Joi.object({
    name: Joi.string().min(2).max(50).trim().required().messages({
        "string.base": "Name must be a string",
        "string.empty": "Name is required",
        "string.min": "Name must be at least 2 characters long",
        "string.max": "Name cannot exceed 50 characters",
        "any.required": "Name is required",
    }),
    email: Joi.string().email().trim().lowercase().required().messages({
        "string.empty": "Email is required",
        "string.email": "Please provide a valid email address",
        "any.required": "Email is required",
    }),
    password: Joi.string().min(6).max(30).required().messages({
        "string.empty": "Password is required",
        "string.min": "Password must be at least 6 characters",
        "string.max": "Password cannot exceed 30 characters",
        "any.required": "Password is required",
    }),
    bio: Joi.string().optional().max(100).messages({
        "string.max": "Bio cannot exceed 100 characters",
    }),
    country: Joi.string().required().messages({
        "string.base": "Country must be a string.",
        "string.empty": "Country cannot be empty.",
        "any.required": "Country is required."
    }),
    referralCode: Joi.string().optional().allow(""),
    img: Joi.string().optional().messages({
        "string.base": "Image URL must be a string",
    }),
    role: Joi.number().optional().default(1).messages({
        "number.base": "Role must be a number",
        "any.only": "Role must be either 0 (Admin) or 1 (User)",
    }),
    isVerified: Joi.boolean().default(false),
    isActive: Joi.boolean().default(true)
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