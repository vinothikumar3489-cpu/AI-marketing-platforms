import { Router } from "express";
import { requireAuth } from "../../../middleware/auth.middleware.js";
import {
  generateCampaignPlan,
  getCampaignPlan,
  getCampaignStatus,
} from "../controllers/campaign.controller.js";

export const campaignRouter = Router();

campaignRouter.use(requireAuth);

campaignRouter.post("/:chatId/generate", generateCampaignPlan);
campaignRouter.get("/:chatId/plan", getCampaignPlan);
campaignRouter.get("/:chatId/status", getCampaignStatus);
