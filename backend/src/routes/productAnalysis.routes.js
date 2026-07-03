import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { runProductAnalysisController, getProductAnalysisController } from "../controllers/productAnalysis.controller.js";

const router = express.Router();

router.post("/:chatId/run", requireAuth, runProductAnalysisController);
router.get("/:chatId", requireAuth, getProductAnalysisController);

export default router;
