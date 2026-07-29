import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { dispatchAgentTask, getAgentStatus, getLearningDashboard } from '../controllers/brain.controller.js';

export const brainRouter = express.Router();

brainRouter.use(requireAuth);

brainRouter.post('/agents/task', dispatchAgentTask);
brainRouter.get('/agents/status', getAgentStatus);
brainRouter.get('/learning', getLearningDashboard);
