import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  getDashboard,
  getHealth,
  getLearning,
  getGraph,
  getAgents,
  getMemory,
  getRecommendations,
  getPerformance,
  getExecutions,
  getDiagnostics,
} from '../controllers/admin.brain.controller.js';

export const adminBrainRouter = express.Router();

adminBrainRouter.use(requireAuth, requireAdmin);

adminBrainRouter.get('/dashboard', getDashboard);
adminBrainRouter.get('/health', getHealth);
adminBrainRouter.get('/learning', getLearning);
adminBrainRouter.get('/graph', getGraph);
adminBrainRouter.get('/agents', getAgents);
adminBrainRouter.get('/memory', getMemory);
adminBrainRouter.get('/recommendations', getRecommendations);
adminBrainRouter.get('/performance', getPerformance);
adminBrainRouter.get('/executions', getExecutions);
adminBrainRouter.get('/diagnostics', getDiagnostics);
