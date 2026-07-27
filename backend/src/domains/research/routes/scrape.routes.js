import express from "express";
import { requireAuth } from "../../../middleware/auth.middleware.js";
import { scrapeWebsiteHandler } from "../controllers/scrape.controller.js";

export const scrapeRouter = express.Router();

scrapeRouter.use(requireAuth);
scrapeRouter.post("/product-website", scrapeWebsiteHandler);
