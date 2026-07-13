import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  handleGenerateEmailCampaign,
  handleGetEmailCampaign,
  handleListEmailCampaigns,
  handleUpdateEmailItem,
  handleRegenerateEmailItem,
  handleSubmitForReview,
  handleApproveCampaign,
  handleRequestChanges,
  handleCreateVersion,
  handleRestoreVersion,
} from "../controllers/email-campaign.controller.js";

export const emailCampaignRouter = Router();

emailCampaignRouter.use(requireAuth);

emailCampaignRouter.post("/:chatId/email-campaign/generate", handleGenerateEmailCampaign);
emailCampaignRouter.get("/:chatId/email-campaign", handleListEmailCampaigns);
emailCampaignRouter.get("/:chatId/email-campaign/:campaignId", handleGetEmailCampaign);
emailCampaignRouter.patch("/:chatId/email-campaign/:campaignId/items/:itemId", handleUpdateEmailItem);
emailCampaignRouter.post("/:chatId/email-campaign/:campaignId/items/:itemId/regenerate", handleRegenerateEmailItem);
emailCampaignRouter.post("/:chatId/email-campaign/:campaignId/submit-review", handleSubmitForReview);
emailCampaignRouter.post("/:chatId/email-campaign/:campaignId/approve", handleApproveCampaign);
emailCampaignRouter.post("/:chatId/email-campaign/:campaignId/request-changes", handleRequestChanges);
emailCampaignRouter.post("/:chatId/email-campaign/:campaignId/versions", handleCreateVersion);
emailCampaignRouter.post("/:chatId/email-campaign/:campaignId/versions/:versionId/restore", handleRestoreVersion);
