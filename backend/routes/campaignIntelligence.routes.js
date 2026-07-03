const express = require('express');
const router = express.Router();
const campaignController = require('../controllers/campaignIntelligence.controller');

// Content Studio
router.post('/chats/:chatId/campaign-intelligence/generate-content', campaignController.generateContent);
router.get('/chats/:chatId/campaign-intelligence/content-studio', campaignController.generateContent);

// Analytics
router.post('/chats/:chatId/campaign-intelligence/generate-analytics', campaignController.generateAnalytics);
router.get('/chats/:chatId/campaign-intelligence/analytics', campaignController.generateAnalytics);

// ROI Optimizer
router.post('/chats/:chatId/campaign-intelligence/generate-roi', campaignController.generateROI);
router.get('/chats/:chatId/campaign-intelligence/roi', campaignController.generateROI);

module.exports = router;
