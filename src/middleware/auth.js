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
        console.log(req.user)
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


const otpAttempts = {};

const blockDurations = [
    2 * 60 * 1000,         // 2 minutes
    60 * 60 * 1000,        // 1 hour
    5 * 60 * 60 * 1000,    // 5 hours
    24 * 60 * 60 * 1000    // 24 hours
];

export function otpBlockMiddleware(req, res, next) {
    const { email } = req.body;

    if (!email) {
        return response.error(res, 400, "Email is required");
    }

    const userData = otpAttempts[email];

    if (
        userData &&
        userData.blockUntil &&
        Date.now() < userData.blockUntil
    ) {
        const waitSec = Math.ceil((userData.blockUntil - Date.now()) / 1000);

        return response.error(
            res,
            resStatusCode.TOO_MANY_REQUESTS,
            `Too many attempts. Try again after ${waitSec} seconds.`,
            {}
        );
    }

    next();
}

export function increaseOtpAttempt(email) {
    if (!otpAttempts[email]) {
        otpAttempts[email] = { attempts: 0, blockLevel: 0, blockUntil: 0 };
    }

    const user = otpAttempts[email];
    user.attempts += 1;

    if (user.attempts >= 5) {
        const duration =
            blockDurations[user.blockLevel] ||
            blockDurations[blockDurations.length - 1];

        user.blockUntil = Date.now() + duration;

        if (user.blockLevel < blockDurations.length - 1) {
            user.blockLevel += 1;
        }

        user.attempts = 0;
        return user.blockUntil;
    }

    return null;
}

export function resetOtpAttempts(email) {
    delete otpAttempts[email];
}
