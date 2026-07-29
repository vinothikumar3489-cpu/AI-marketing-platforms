import { runCompetitorAnalysis, runIntentPrediction, runPositioning } from "./competitor.service.js";
import prisma from "../../config/prisma.js";
import { getBrain } from "../../brain/index.js";

export const runCompetitorsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body || {};

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user" });
  }

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'competitor',
        action: 'run_analysis',
        userId,
        chatId,
        companyName: input.companyName || '',
        website: input.websiteUrl || '',
        industry: input.industry || '',
        productName: input.productName || '',
        payload: input,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) {
    console.error("[BRAIN] competitor controller (run):", e.message);
  }

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
      return res.status(400).json({ success: false, ...out, brain: brainSummary });
    }
    return res.json({
      success: true,
      competitorAnalysis: out.result,
      brain: brainSummary,
    });
  } catch (e) {
    console.error("runCompetitorsHandler", e);
    return res.status(500).json({ success: false, error: e?.message || "Internal error", brain: brainSummary });
  }
};

export const runIntentHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'competitor',
        action: 'intent_prediction',
        userId, chatId,
        productName: input.productName || '',
        payload: input,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) { console.error("[BRAIN] intent handler:", e.message); }

  try { const out = await runIntentPrediction({ chatId, userId, input }); return res.json({ ...out.result, brain: brainSummary }); } catch(e){ console.error(e); return res.status(500).json({ success: false, error: e.message, brain: brainSummary }); }
};

export const runPositioningHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'competitor',
        action: 'positioning',
        userId, chatId,
        productName: input.productName || '',
        payload: input,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) { console.error("[BRAIN] positioning handler:", e.message); }

  try { const out = await runPositioning({ chatId, userId, input }); return res.json({ ...out.result, brain: brainSummary }); } catch(e){ console.error(e); return res.status(500).json({ success: false, error: e.message, brain: brainSummary }); }
};

export const getCompetitorIntelligence = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ success: false, error: "Missing chatId or user" });
  }

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'competitor',
        action: 'get_intelligence',
        userId,
        chatId,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) {
    console.error("[BRAIN] competitor get handler:", e.message);
  }

  try {
    const ci = await prisma.competitorIntelligence.findUnique({ where: { chatId } });
    if (!ci || ci.userId !== userId) {
      return res.json({ success: false, competitorAnalysis: null, brain: brainSummary });
    }
    const ca = ci.competitorAnalysis;
    const response = ca ? {
      ...ca,
      provider: ci.provider,
      fallbackUsed: ci.fallbackUsed
    } : null;

    return res.json({ success: true, competitorAnalysis: response, brain: brainSummary });
  } catch (e) {
    console.error("getCompetitorIntelligence", e);
    return res.status(500).json({ success: false, error: e?.message || "Internal error", brain: brainSummary });
  }
};
