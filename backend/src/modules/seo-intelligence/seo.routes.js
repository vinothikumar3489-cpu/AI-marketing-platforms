import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  runSeoHandler,
  getSeoHandler,
  getKeywordIntelligence,
  regenerateKeywordIntelligence,
  getGeoIntelligence,
  regenerateGeoIntelligence,
  getCompetitorIntelligence,
  regenerateCompetitorIntelligence,
  getContentGapsHandler,
  runContentGapsHandler,
  getBlogsHandler,
  runBlogsHandler,
  getDashboardHandler,
  runDashboardHandler
} from './seo.controller.js';

export const seoRouter = express.Router();
seoRouter.use(requireAuth);
seoRouter.post('/:chatId/seo-intelligence/run', runSeoHandler);
seoRouter.get('/:chatId/seo-intelligence', getSeoHandler);
seoRouter.get('/:chatId/seo-intelligence/keywords', getKeywordIntelligence);
seoRouter.post('/:chatId/seo-intelligence/keywords/run', regenerateKeywordIntelligence);
seoRouter.get('/:chatId/seo-intelligence/geo', getGeoIntelligence);
seoRouter.post('/:chatId/seo-intelligence/geo/run', regenerateGeoIntelligence);
seoRouter.get('/:chatId/seo-intelligence/competitors', getCompetitorIntelligence);
seoRouter.post('/:chatId/seo-intelligence/competitors/run', regenerateCompetitorIntelligence);

// Content Gap Intelligence
seoRouter.get('/:chatId/seo-intelligence/content-gaps', getContentGapsHandler);
seoRouter.post('/:chatId/seo-intelligence/content-gaps/run', runContentGapsHandler);

// Blog Intelligence
seoRouter.get('/:chatId/seo-intelligence/blogs', getBlogsHandler);
seoRouter.post('/:chatId/seo-intelligence/blogs/run', runBlogsHandler);

// Executive Dashboard
seoRouter.get('/:chatId/seo-intelligence/dashboard', getDashboardHandler);
seoRouter.post('/:chatId/seo-intelligence/dashboard/run', runDashboardHandler);
