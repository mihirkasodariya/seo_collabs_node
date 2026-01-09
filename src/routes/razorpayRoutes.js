import { Router } from "express";
const router = Router();
import { authorizeRoles, validateAccessToken } from "../middleware/auth.js";
import { createPayment, verifyPayment } from "../controllers/RazorpayController.js";


router.post("/create-payment", validateAccessToken, createPayment);
router.post("/verify-payment", validateAccessToken, verifyPayment);
// router.delete("/deleteFaq/:id", deleteFaq);

export default router;