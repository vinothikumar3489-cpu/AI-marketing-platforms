import express from "express";
import { requireAuth } from "../middleware/auth.middleware.js";
import { upsertProductProfile, getProductProfile, runProductAnalysis, getProductAnalysis } from "../controllers/product.controller.js";
import { runMarketDiscoveryHandler, getMarketDiscoveryHandler } from "../modules/product-intelligence/marketDiscovery/marketDiscovery.controller.js";
import { runProductHandler, runAudienceHandler, getProductIntelligenceHandler } from "../modules/product-intelligence/product.controller.js";

export const productRouter = express.Router();

productRouter.use(requireAuth);
productRouter.post("/:chatId/product-profile", upsertProductProfile);
productRouter.get("/:chatId/product-profile", getProductProfile);
productRouter.post("/:chatId/product-analysis/run", runProductAnalysis);
productRouter.get("/:chatId/product-analysis", getProductAnalysis);
productRouter.post("/:chatId/product-intelligence/market/run", runMarketDiscoveryHandler);
productRouter.get("/:chatId/product-intelligence/market", getMarketDiscoveryHandler);
productRouter.post('/:chatId/product-intelligence/product/run', runProductHandler);
productRouter.post('/:chatId/product-intelligence/audience/run', runAudienceHandler);
productRouter.get('/:chatId/product-intelligence', getProductIntelligenceHandler);
