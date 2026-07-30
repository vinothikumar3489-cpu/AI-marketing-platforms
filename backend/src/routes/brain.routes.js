import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import {
  dispatchAgentTask,
  getAgentStatus,
  getLearningDashboard,
  evaluateDecision,
  simulateDecision,
  compareDecisions,
  getDecisionHistory,
  getDecisionById,
  recordDecisionOutcome,
} from '../controllers/brain.controller.js';

export const brainRouter = express.Router();

brainRouter.use(requireAuth);

brainRouter.post('/agents/task', dispatchAgentTask);
brainRouter.get('/agents/status', getAgentStatus);
brainRouter.get('/learning', getLearningDashboard);

// Decision Intelligence endpoints
brainRouter.post('/decisions/evaluate', evaluateDecision);
brainRouter.post('/decisions/simulate', simulateDecision);
brainRouter.post('/decisions/compare', compareDecisions);
brainRouter.get('/decisions/history', getDecisionHistory);
brainRouter.get('/decisions/:id', getDecisionById);
brainRouter.post('/decisions/:id/outcome', recordDecisionOutcome);
