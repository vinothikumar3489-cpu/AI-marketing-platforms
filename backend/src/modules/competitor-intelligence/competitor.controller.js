
import { runCompetitorAnalysis, runIntentPrediction, runPositioning } from "./competitor.service.js";
import prisma from "../../config/prisma.js";

export const runCompetitorsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body || {};

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user" });
  }

  // Ensure chat exists, create if not
  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.create({
        data: {
          id: chatId,
          userId,
          title: input.productName || "New Competitor Analysis",
          productName: input.productName
        }
      });
    }
  } catch (e) {
    console.error("Error checking/creating chat:", e);
  }

  try {
    const out = await runCompetitorAnalysis({ chatId, userId, input });
    if (!out.success) {
      return res.status(400).json({ success: false, ...out });
    }
    return res.json({
      success: true,
      competitorAnalysis: out.result
    });
  } catch (e) {
    console.error("runCompetitorsHandler", e);
    return res.status(500).json({ success: false, error: e?.message || "Internal error" });
  }
};

export const runIntentHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};
  try { const out = await runIntentPrediction({ chatId, userId, input }); return res.json(out.result); } catch(e){ console.error(e); return res.status(500).json({ success: false, error: e.message }); }
};

export const runPositioningHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};
  try { const out = await runPositioning({ chatId, userId, input }); return res.json(out.result); } catch(e){ console.error(e); return res.status(500).json({ success: false, error: e.message }); }
};

export const getCompetitorIntelligence = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user" });
  }

  try {
    const ci = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    if (!ci || ci.userId !== userId) {
      return res.json({ success: false, competitorAnalysis: null });
    }
    // Include provider and fallbackUsed in response
    const ca = ci.competitorAnalysis;
    const response = ca ? {
      ...ca,
      provider: ci.provider,
      fallbackUsed: ci.fallbackUsed
    } : null;

    return res.json({ success: true, competitorAnalysis: response });
  } catch (e) {
    console.error("getCompetitorIntelligence", e);
    return res.status(500).json({ success: false, error: e?.message || "Internal error" });
  }
};

