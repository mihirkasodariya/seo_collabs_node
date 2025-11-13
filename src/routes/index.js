'use strict'
import { Router } from "express";
import auth from "./authRoutes.js";
import wesiteRoutes from "./websiteRoutes.js"
import linkExchange from "./exchangeRoutes.js"
import chat from "./chatRoutes.js"
const router = Router();

router.use("/auth", auth);
router.use("/website", wesiteRoutes);
router.use("/exchange", linkExchange);
router.use("/chat", chat);

export default router;