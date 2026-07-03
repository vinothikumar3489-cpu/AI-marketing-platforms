import express from "express";
import { getSeo, runSeo, getContentGaps, runContentGaps, getBlogs, runBlogs, getExecutiveDashboard, runExecutiveDashboard } from "../controllers/seo.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const seoRouter = express.Router();

seoRouter.use(requireAuth);
seoRouter.get("/:chatId/seo", getSeo);
seoRouter.post("/:chatId/seo/run", runSeo);

// Content Gap Intelligence Routes
seoRouter.get("/:chatId/seo-intelligence/content-gaps", getContentGaps);
seoRouter.post("/:chatId/seo-intelligence/content-gaps/run", runContentGaps);

// Blog Intelligence Routes
seoRouter.get("/:chatId/seo-intelligence/blogs", getBlogs);
seoRouter.post("/:chatId/seo-intelligence/blogs/run", runBlogs);

// Executive Dashboard Routes
seoRouter.get("/:chatId/seo-intelligence/dashboard", getExecutiveDashboard);
seoRouter.post("/:chatId/seo-intelligence/dashboard/run", runExecutiveDashboard);
