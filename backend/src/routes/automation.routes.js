import { Router } from "express";
import { z } from "zod";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  getAutomationDemo,
  generateAutomationDemo,
  getAutomationAssets,
  updateAssetStatus,
  regenerateAsset,
  getAutomationLogs,
  executeAllModules,
  executeSingleModule,
  getExecutionData,
  getEvidenceContext,
  getReadinessCheck,
  getExecutionHistory,
  getContentBrief,
  generateContentItem,
  generateAllContent,
  getContentAssetList,
  getAssetVersionHistory,
  regenerateContentAsset,
} from "../controllers/automation.controller.js";
import { validate } from "../middleware/validate.js";

export const automationRouter = Router();

const updateAssetStatusSchema = z.object({
  status: z.enum(["draft", "needs_review", "approved", "rejected", "scheduled", "published_demo"]),
  scheduledFor: z.string().optional(),
  reviewNotes: z.string().max(1000).optional(),
});

// All automation routes require authentication
automationRouter.use(requireAuth);

// GET /api/automation/:chatId/plan - Get existing automation plan
automationRouter.get("/:chatId/plan", getAutomationDemo);

// POST /api/automation/:chatId/generate - Generate new automation plan
automationRouter.post("/:chatId/generate", generateAutomationDemo);

// GET /api/automation/:chatId/readiness - Get readiness checklist (Phase 2)
automationRouter.get("/:chatId/readiness", getReadinessCheck);

// GET /api/automation/:chatId/assets - Get all automation assets
automationRouter.get("/:chatId/assets", getAutomationAssets);

// PUT /api/automation/assets/:assetId/status - Update asset status (approve/reject/schedule)
automationRouter.put("/assets/:assetId/status", validate(updateAssetStatusSchema), updateAssetStatus);

// POST /api/automation/assets/:assetId/regenerate - Regenerate specific asset
automationRouter.post("/assets/:assetId/regenerate", regenerateAsset);

// GET /api/automation/:chatId/logs - Get automation log history
automationRouter.get("/:chatId/logs", getAutomationLogs);

// Phase 6 — Marketing Execution Platform
automationRouter.post("/:chatId/execute", executeAllModules);
automationRouter.post("/:chatId/execute/:module", executeSingleModule);
automationRouter.get("/:chatId/execution", getExecutionData);
automationRouter.get("/:chatId/evidence-context", getEvidenceContext);

// Phase 9 — Execution History
automationRouter.get("/:chatId/execution-history", getExecutionHistory);

// Phase 1 — Content Brief
automationRouter.get("/:chatId/content-brief", getContentBrief);

// Phase 3–10 — Content Studio
automationRouter.post("/:chatId/content", generateContentItem);
automationRouter.post("/:chatId/content/plan", generateAllContent);
automationRouter.get("/:chatId/content/assets", getContentAssetList);
automationRouter.get("/content/assets/:assetId/versions", getAssetVersionHistory);
automationRouter.post("/content/assets/:assetId/regenerate", regenerateContentAsset);
