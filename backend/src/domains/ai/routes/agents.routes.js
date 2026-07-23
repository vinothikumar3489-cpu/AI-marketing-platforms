
import express from 'express';
import { requireAuth } from "../../../middleware/auth.middleware.js";
import { runAgentHandler, getAgentsHandler } from "../controllers/agents.controller.js";

export const agentsRouter = express.Router();
agentsRouter.use(requireAuth);
agentsRouter.post('/:chatId/ai-assistant/chat', runAgentHandler);
agentsRouter.get('/:chatId/ai-assistant/messages', getAgentsHandler);
