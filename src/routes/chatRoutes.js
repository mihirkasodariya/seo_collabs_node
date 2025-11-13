import { Router } from "express";
const router = Router();
import {
   getMessages,
   getChatUsers
} from "../controllers/chatController.js";

import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.get("/:userId/:receiverId", validateAccessToken, getMessages);

// ✅ Get all chat users for a specific user
router.get("/users", validateAccessToken, getChatUsers);

export default router;