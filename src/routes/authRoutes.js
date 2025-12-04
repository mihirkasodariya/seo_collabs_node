import { Router } from "express";
const router = Router();
import {
    login,
    register,
    verifyOtp,
    resendOtp,
    getProfile,
    updateProfile,
    adminLogin,
    getUsersList,
    getUserById,
    updateUserById,
    getActiveUsersList,
    getNetworkUserById
} from "../controllers/authController.js";
import { validateAccessToken, authorizeRoles, otpBlockMiddleware } from "../middleware/auth.js";
import { profileImage } from "../utils/imageHelper.js";


router.post("/login", login);
router.post("/adminLogin", adminLogin);
router.get("/getUsersList", validateAccessToken, authorizeRoles(0), getUsersList);
router.get("/getActiveUsersList", validateAccessToken, getActiveUsersList);
router.get("/getNetworkUserById/:ownerId/:userId", validateAccessToken, getNetworkUserById);
router.get("/getUserById/:userId", validateAccessToken, authorizeRoles(0), getUserById);
router.put("/updateUserById/:userId", profileImage, validateAccessToken, authorizeRoles(0), updateUserById);
router.post("/register", register);
router.post("/verify-otp", otpBlockMiddleware, verifyOtp);
router.post("/resendOtp", otpBlockMiddleware, resendOtp);
router.get("/getProfile", validateAccessToken, getProfile);
router.put("/updateProfile", validateAccessToken, profileImage, updateProfile);

export default router;