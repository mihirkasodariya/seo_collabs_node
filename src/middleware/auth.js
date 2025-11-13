'use strict'
import jwt from "jsonwebtoken";
import { authModel } from "../models/authModel.js";
import response from "../utils/response.js";
import { resStatusCode, resMessage } from "../utils/constants.js";

export async function generateJWToken(payload) {
    try {
        const secret = process.env.JWT_SECRET;
        const signOptions = {
            issuer: "tracking",
            expiresIn: process.env.JWT_EXPIRES_IN,
        };
        payload.creationDateTime = Date.now();
        const token = jwt.sign(payload, secret, signOptions);
        return token;
    } catch (error) {
        console.error("Generate JWT Token Error:", error.message);
        return error;
    };
};

export async function validateAccessToken(req, res, next) {
    const token = req.headers.authorization || req.headers.Authorization;
    try {
        if (!token) {
            return response.error(res, resStatusCode.CLIENT_ERROR, resMessage.NO_TOKEN_PROVIDED, {});
        };
        const decodedToken = jwt.verify(token, process.env.JWT_SECRET, {
            issuer: "tracking",
            expiresIn: process.env.JWT_EXPIRES_IN,
        });
        const authenticatedUser = await authModel.findById({ _id: decodedToken._id });
        if (!authenticatedUser) {
            return response.error(res, resStatusCode.INVALID_TOKEN, resMessage.UNAUTHORISED, {});
        };
        req.user = authenticatedUser;
        console.debug("\x1b[32m[AccessToken] Token Verified Successfully. Admin ID:\x1b[36m", req.user.id, "\x1b[0m");
        next();
    } catch (error) {
        console.error("JWT Verification Error:", error.message);
        if (error?.name === "TokenExpiredError") {
            return response.error(res, resStatusCode.INVALID_TOKEN, resMessage.TOKEN_EXPIRED, {});
        } else if (error?.name === "JsonWebTokenError") {
            return response.error(res, resStatusCode.INVALID_TOKEN, resMessage.TOKEN_INVALID, {});
        } else {
            return response.error(res, resStatusCode.INVALID_TOKEN, resMessage.TOKEN_INVALID, {});
        };
    };
};

export function authorizeRoles(...allowedRoles) {
    return (req, res, next) => {
        try {
            if (!req.user || !allowedRoles.includes(req.user.role)) {
                return res.status(resStatusCode.FORBIDDEN).json({ success: false, status: 0, message: resMessage.ACCESS_DENIED, data: {} });
            };
            next();
        } catch (error) {
            return response.error(res, resStatusCode.INTERNAL_SERVER_ERROR, resMessage.INTERNAL_SERVER_ERROR, {});
        };
    };
};