import express from "express";

export const integrationsRouter = express.Router();

integrationsRouter.post("/seo/connect", (req, res) => {
  // Placeholder: in real app we'd persist credentials securely
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
