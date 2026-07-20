import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  runSeoHandler, getSeoHandler, getKeywordIntelligence,
  getGeoIntelligenceHandler, getCompetitorSeoHandler,
  getContentGapsHandler, getDashboardHandler,
  getSEOProviderStatusHandler, clearSEOCacheHandler
} from './seo.controller.js';

export const seoRouter = express.Router();
seoRouter.use(requireAuth);

seoRouter.post('/:chatId/seo-intelligence/run', runSeoHandler);
seoRouter.get('/:chatId/seo-intelligence', getSeoHandler);
seoRouter.get('/:chatId/seo-intelligence/keywords', getKeywordIntelligence);
seoRouter.get('/:chatId/seo-intelligence/geo', getGeoIntelligenceHandler);
seoRouter.get('/:chatId/seo-intelligence/competitors', getCompetitorSeoHandler);
seoRouter.get('/:chatId/seo-intelligence/content-gaps', getContentGapsHandler);
seoRouter.get('/:chatId/seo-intelligence/dashboard', getDashboardHandler);

seoRouter.get('/:chatId/seo-intelligence/providers', getSEOProviderStatusHandler);
seoRouter.post('/:chatId/seo-intelligence/cache/clear', clearSEOCacheHandler);
