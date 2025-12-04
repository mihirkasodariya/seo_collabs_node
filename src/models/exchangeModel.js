import Joi from "joi";
import mongoose, { model } from "mongoose";
const { Schema, Types } = mongoose;
import { dbTableName } from "../utils/constants.js";

const websiteSchema = new Schema(
    {
        userId: { type: Types.ObjectId, ref: dbTableName.AUTH, require: true },
        url: { type: String, required: true },
        type: { type: String, required: true },
        Categories: { type: [String], required: true },
        linkReqs: { type: String, required: true },
        isLinkExchange: { type: Boolean, required: true },
        isActive: { type: Boolean, default: true },
    },
    { timestamps: true }
);
export const websiteModel = model(dbTableName.WEBSITE, websiteSchema);

export const websiteValidation = Joi.object({
    url: Joi.string().uri().required().messages({
        "string.base": "URL must be a string",
        "string.empty": "URL is required",
        "string.uri": "Please provide a valid URL",
        "any.required": "URL is required",
    }),
    type: Joi.string().min(2).max(50).required().messages({
        "string.empty": "Type is required",
        "string.min": "Type must be at least 2 characters long",
        "string.max": "Type cannot exceed 50 characters",
        "any.required": "Type is required",
    }),
    Categories: Joi.array().items(Joi.string().trim()).required().messages({
        "array.base": "Categories must be an array",
        "array.min": "Please select at least 1 category",
        "any.required": "Categories are required",
    }),
    linkReqs: Joi.string().required().messages({
        "string.empty": "Link requirements are required",
        "string.min": "Link requirements must be at least 2 characters long",
        "string.max": "Link requirements cannot exceed 500 characters",
        "any.required": "Link requirements are required",
    }),
    isLinkExchange: Joi.boolean().required().messages({
        "string.empty": "isLinkExchange requirements are required",
        "any.required": "isLinkExchange requirements are required",
    }),
    isActive: Joi.boolean().default(true),
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
