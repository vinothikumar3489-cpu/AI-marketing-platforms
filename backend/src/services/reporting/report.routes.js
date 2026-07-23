import express from 'express';
import { requireAuth } from "../../middleware/auth.middleware.js";
import {
  exportExecutiveReportHandler,
  exportGrowthReportHandler,
  exportSeoReportHandler,
  exportRawDataHandler,
  checkReportStatusHandler,
} from "./report.controller.js";

export const reportRouter = express.Router();

reportRouter.use(requireAuth);

// GET /api/chats/:chatId/report/executive/:format
reportRouter.get('/:chatId/report/executive/:format', exportExecutiveReportHandler);

// GET /api/chats/:chatId/report/growth/:format
reportRouter.get('/:chatId/report/growth/:format', exportGrowthReportHandler);

// GET /api/chats/:chatId/report/seo/:format
reportRouter.get('/:chatId/report/seo/:format', exportSeoReportHandler);

// GET /api/chats/:chatId/report/export/:format — convenience alias
reportRouter.get('/:chatId/report/export/:format', exportRawDataHandler);

// GET /api/chats/:chatId/report/status/:jobId
reportRouter.get('/:chatId/report/status/:jobId', checkReportStatusHandler);
