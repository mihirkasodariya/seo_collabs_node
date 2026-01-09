import { Router } from "express";
const router = Router();
import { getDashboard, getNotifications } from "../controllers/dashboardController.js";
import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.get("/getDashboard", validateAccessToken, getDashboard);
router.get("/getNotifications", validateAccessToken, getNotifications);

export default router;