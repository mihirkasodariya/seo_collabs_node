import { Router } from "express";
const router = Router();
import { addReportUser } from "../controllers/reportUserController.js";
import { validateAccessToken, authorizeRoles, otpBlockMiddleware } from "../middleware/auth.js";

router.post("/addReportUser", validateAccessToken, addReportUser);


export default router;