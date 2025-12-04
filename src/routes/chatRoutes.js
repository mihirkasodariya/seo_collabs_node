import { Router } from "express";
const router = Router();
import {
   getMessages,
   getChatUsers
} from "../controllers/chatController.js";

import { validateAccessToken, authorizeRoles } from "../middleware/auth.js";

router.get("/:userId/:receiverId", validateAccessToken, getMessages);
router.get("/users", validateAccessToken, getChatUsers);

export default router;