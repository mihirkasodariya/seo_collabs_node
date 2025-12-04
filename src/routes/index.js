'use strict'
import { Router } from "express";
import auth from "./authRoutes.js";
import wesiteRoutes from "./websiteRoutes.js"
import linkExchange from "./exchangeRoutes.js"
import chat from "./chatRoutes.js"
import plan from "./plansRoutes.js"
import requestExchange from "./userExchangeRoutes.js"
import report from "./reportUserRoutes.js"
const router = Router();

router.use("/auth", auth);
router.use("/website", wesiteRoutes);
router.use("/exchange", linkExchange);
router.use("/chat", chat);
router.use("/plan", plan);
router.use("/request-exchange", requestExchange);
router.use("/report", report);

export default router;