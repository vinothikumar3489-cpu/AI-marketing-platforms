import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { runFullAnalysisHandler, getResultsHandler, getStatusHandler } from './growthWorkspace.controller.js';

export const growthWorkspaceRouter = express.Router();

growthWorkspaceRouter.use(requireAuth);

// Route-entry logging middleware
growthWorkspaceRouter.use('/:chatId/growth-workspace', (req, res, next) => {
  console.info('[Growth Route Matched]', {
    method: req.method,
    path: req.originalUrl,
    chatId: req.params.chatId,
  });
  next();
});

// POST /api/chats/:chatId/growth-workspace/run-full-analysis
growthWorkspaceRouter.post('/:chatId/growth-workspace/run-full-analysis', runFullAnalysisHandler);

// GET /api/chats/:chatId/growth-workspace/results
growthWorkspaceRouter.get('/:chatId/growth-workspace/results', getResultsHandler);

// GET /api/chats/:chatId/growth-workspace/status
growthWorkspaceRouter.get('/:chatId/growth-workspace/status', getStatusHandler);
