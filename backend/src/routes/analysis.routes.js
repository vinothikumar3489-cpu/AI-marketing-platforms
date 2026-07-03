import express from "express";
import { analyzeProduct } from "../controllers/analysis.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const analysisRouter = express.Router();

analysisRouter.use(requireAuth);
analysisRouter.post("/product", analyzeProduct);
