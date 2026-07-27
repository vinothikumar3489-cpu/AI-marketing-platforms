import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../../../middleware/auth.middleware.js";
import { getDashboardSummary, getExecutiveDashboard, exportExecutiveReport } from "../controllers/dashboard.controller.js";
import { validate } from "../../../middleware/validate.js";

export const dashboardRouter = Router();

const exportReportSchema = z.object({
  chatId: z.string().min(1, "chatId is required"),
  format: z.enum(["csv", "json", "docx", "pdf", "ppt"]).optional().default("csv"),
  reportType: z.string().optional().default("executive"),
});

// GET /api/dashboard/summary
dashboardRouter.get("/summary", requireAuth, getDashboardSummary);

// GET /api/dashboard/executive/:chatId
dashboardRouter.get("/executive/:chatId", requireAuth, getExecutiveDashboard);

// POST /api/dashboard/export
dashboardRouter.post("/export", requireAuth, validate(exportReportSchema), exportExecutiveReport);
