import { Router } from "express";
const router = Router();
import {
    login,
    register,
    getProfile,
    updateProfile
} from "../controllers/authController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";
import { profileImage } from "../utils/imageHelper.js";
router.post("/login", login);
router.post("/register", register);
router.get("/getProfile", validateAccessToken, getProfile);
router.put("/updateProfile", validateAccessToken, profileImage, updateProfile);

export default router;