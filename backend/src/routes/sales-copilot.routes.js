import { Router } from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import {
  handleGetDashboard, handleGetDealInsights, handleGenerateFollowUp,
  handleGetNextBestAction, handleScoreOpportunity, handleGetSalesTimeline,
  handleGetConversationMemory, handleGetMeetingPrep,
  handleGenerateProposal, handleListProposals, handleGetCustomerHealth,
  handleRunAutomation, handleGetCopilotNotifications,
} from "../controllers/sales-copilot.controller.js";

export const salesCopilotRouter = Router();

salesCopilotRouter.use(requireAuth);

salesCopilotRouter.get("/:chatId/copilot/dashboard", handleGetDashboard);
salesCopilotRouter.get("/:chatId/copilot/deals/:dealId/insights", handleGetDealInsights);
salesCopilotRouter.post("/:chatId/copilot/deals/:dealId/follow-up", handleGenerateFollowUp);
salesCopilotRouter.get("/:chatId/copilot/contacts/:contactId/nba", handleGetNextBestAction);
salesCopilotRouter.get("/:chatId/copilot/deals/:dealId/score", handleScoreOpportunity);
salesCopilotRouter.get("/:chatId/copilot/timeline", handleGetSalesTimeline);
salesCopilotRouter.get("/:chatId/copilot/memory", handleGetConversationMemory);
salesCopilotRouter.get("/:chatId/copilot/contacts/:contactId/meeting-prep", handleGetMeetingPrep);
salesCopilotRouter.post("/:chatId/copilot/deals/:dealId/proposals", handleGenerateProposal);
salesCopilotRouter.get("/:chatId/copilot/proposals", handleListProposals);
salesCopilotRouter.get("/:chatId/copilot/health", handleGetCustomerHealth);
salesCopilotRouter.post("/:chatId/copilot/automation", handleRunAutomation);
salesCopilotRouter.get("/:chatId/copilot/notifications", handleGetCopilotNotifications);
