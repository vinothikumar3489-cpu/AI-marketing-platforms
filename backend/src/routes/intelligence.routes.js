import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { requireAdmin } from '../middleware/admin.middleware.js';
import {
  getOverview,
  getMarket,
  getCompetitors,
  getSeoOpportunities,
  getContentOpportunities,
  getCampaignInsights,
  getLeadOpportunities,
  getAlerts,
  acknowledgeAlert,
  getTrends,
  getInsights,
  runCycle,
  runModule,
} from '../controllers/intelligence.controller.js';

export const intelligenceRouter = express.Router();

intelligenceRouter.use(requireAuth, requireAdmin);

intelligenceRouter.get('/overview', getOverview);
intelligenceRouter.get('/market', getMarket);
intelligenceRouter.get('/competitors', getCompetitors);
intelligenceRouter.get('/seo-opportunities', getSeoOpportunities);
intelligenceRouter.get('/content-opportunities', getContentOpportunities);
intelligenceRouter.get('/campaign-insights', getCampaignInsights);
intelligenceRouter.get('/lead-opportunities', getLeadOpportunities);
intelligenceRouter.get('/alerts', getAlerts);
intelligenceRouter.post('/alerts/:alertId/acknowledge', acknowledgeAlert);
intelligenceRouter.get('/trends', getTrends);
intelligenceRouter.get('/insights', getInsights);
intelligenceRouter.post('/run-cycle', runCycle);
intelligenceRouter.post('/run-module/:name', runModule);