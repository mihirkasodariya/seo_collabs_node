'use strict'
import { Router } from "express";
import auth from "./authRoutes.js";
import wesiteRoutes from "./websiteRoutes.js"
import linkExchange from "./exchangeRoutes.js"
import chat from "./chatRoutes.js"
import plan from "./plansRoutes.js"
import requestExchange from "./userExchangeRoutes.js"
import report from "./reportUserRoutes.js"
import linkCheck from "./linkCheckRoutes.js"
import dashboard from "./dashboardRoutes.js"
import faq from "./faqRoutes.js"
import payment from "./razorpayRoutes.js"

const router = Router();

router.use("/auth", auth);
router.use("/website", wesiteRoutes);
router.use("/exchange", linkExchange);
router.use("/chat", chat);
router.use("/plan", plan);
router.use("/request-exchange", requestExchange);
router.use("/report", report);
router.use("/link-check", linkCheck);
router.use("/dashboard", dashboard);
router.use("/faq", faq);
router.use("/payment", payment);

export default router;