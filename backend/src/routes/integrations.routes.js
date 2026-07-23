import express from "express";
import rateLimit from "express-rate-limit";
import { requireAuth } from "../middleware/auth.middleware.js";
import { getHealth, sendEmail, generatePosterImage, renderVideoHandler, getVideoStatusHandler, debugTestPollinations, debugTestFal, debugTestCloudinary, debugTestShotstack, debugTestCreatomate, handleBrevoWebhook } from "../controllers/integrations.controller.js";

export const integrationsRouter = express.Router();

// Brevo webhook endpoint (NO auth - public endpoint for Brevo)
integrationsRouter.post("/webhooks/brevo", handleBrevoWebhook);

integrationsRouter.use(requireAuth);

const isProduction = process.env.NODE_ENV === "production";
const minute = 60 * 1000;

const emailLimiter = rateLimit({
  windowMs: 60 * minute,
  max: isProduction ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

const imageLimiter = rateLimit({
  windowMs: 60 * minute,
  max: isProduction ? 10 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

const videoLimiter = rateLimit({
  windowMs: 60 * minute,
  max: isProduction ? 3 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// Provider health check
integrationsRouter.get("/health", getHealth);

// Email sending — rate limited
integrationsRouter.post("/:chatId/studio/email/send-test", emailLimiter, sendEmail);

// Image generation — rate limited
integrationsRouter.post("/:chatId/studio/creative/generate-image", imageLimiter, generatePosterImage);

// Video rendering — rate limited
integrationsRouter.post("/:chatId/studio/video/render", videoLimiter, renderVideoHandler);

// Video status polling
integrationsRouter.get("/video/status/:provider/:renderId", getVideoStatusHandler);

// Legacy SEO status (keep for backward compat)
integrationsRouter.post("/seo/connect", (req, res) => {
  return res.json({ status: "ok", message: "Connection endpoint received" });
});

integrationsRouter.get("/seo/status", (req, res) => {
  const status = {
    google: !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET),
    semrush: !!process.env.SEMRUSH_API_KEY,
    ahrefs: !!process.env.AHREFS_API_KEY,
  };
  return res.json({ status });
});

// Debug / diagnostics endpoints (guarded by env var)
const debugGuard = (req, res, next) => {
  if (process.env.DEBUG_INTEGRATIONS !== 'true') {
    return res.status(403).json({ success: false, error: 'Debug endpoints are disabled. Set DEBUG_INTEGRATIONS=true to enable.' });
  }
  next();
};

integrationsRouter.get("/debug/pollinations", debugGuard, debugTestPollinations);
integrationsRouter.get("/debug/fal", debugGuard, debugTestFal);
integrationsRouter.get("/debug/cloudinary", debugGuard, debugTestCloudinary);
integrationsRouter.get("/debug/shotstack", debugGuard, debugTestShotstack);
integrationsRouter.get("/debug/creatomate", debugGuard, debugTestCreatomate);
