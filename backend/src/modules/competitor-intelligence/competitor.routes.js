import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import { runCompetitorsHandler, runIntentHandler, runPositioningHandler, getCompetitorIntelligence } from './competitor.controller.js';

export const competitorRouter = express.Router();
competitorRouter.use(requireAuth);
competitorRouter.post('/:chatId/competitor-intelligence/competitors/run', runCompetitorsHandler);
competitorRouter.post('/:chatId/competitor-intelligence/intent/run', runIntentHandler);
competitorRouter.post('/:chatId/competitor-intelligence/positioning/run', runPositioningHandler);
competitorRouter.get('/:chatId/competitor-intelligence', getCompetitorIntelligence);
