import { runProductAnalysisForPI, runAudienceAnalysis, getProductIntelligence } from "./product.service.js";
import prisma from "../../config/prisma.js";
import { getBrain } from "../../brain/index.js";

export const runProductHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};
  if (!chatId || !userId) return res.status(400).json({ error: 'Missing chatId or user' });

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'product',
        action: 'run_analysis',
        userId, chatId,
        companyName: input.companyName || '',
        website: input.websiteUrl || '',
        industry: input.industry || '',
        productName: input.productName || '',
        payload: input,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) { console.error("[BRAIN] product controller (run):", e.message); }

  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.create({
        data: { id: chatId, userId, title: input.productName || 'New Product Intelligence', productName: input.productName }
      });
    }
    const out = await runProductAnalysisForPI({ chatId, userId, input });
    if (!out.success) return res.status(400).json({ ...out, brain: brainSummary });
    return res.json({ success: true, productAnalysis: out.analysis, brain: brainSummary });
  } catch(e){ console.error(e); return res.status(500).json({ error: e.message, brain: brainSummary }); }
};

export const runAudienceHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};
  if (!chatId || !userId) return res.status(400).json({ error: 'Missing chatId or user' });

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'product',
        action: 'audience_analysis',
        userId, chatId,
        productName: input.productName || '',
        payload: input,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) { console.error("[BRAIN] audience handler:", e.message); }

  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.create({
        data: { id: chatId, userId, title: input.productName || 'New Audience Intelligence', productName: input.productName }
      });
    }
    const out = await runAudienceAnalysis({ chatId, userId, input });
    if (!out.success) return res.status(400).json({ ...out, brain: brainSummary });
    return res.json({ success: true, audienceIntelligence: out.audience, brain: brainSummary });
  } catch(e){ console.error(e); return res.status(500).json({ error: e.message, brain: brainSummary }); }
};

export const getProductIntelligenceHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id;

  let brainSummary = null;
  try {
    const brain = getBrain();
    if (brain) {
      const brainResponse = await brain.process({
        module: 'product',
        action: 'get_intelligence',
        userId, chatId,
      });
      brainSummary = brainResponse.toControllerSummary();
    }
  } catch (e) { console.error("[BRAIN] product get handler:", e.message); }

  try {
    const out = await getProductIntelligence({ chatId, userId });
    if (!out || out.userId !== userId) return res.json({ success:false, productAnalysis: null, marketDiscovery: null, audienceIntelligence: null, brain: brainSummary });
    return res.json({
      success:true,
      productAnalysis: out.productAnalysis ? { ...out.productAnalysis, provider: out.provider, fallbackUsed: out.fallbackUsed } : null,
      marketDiscovery: out.marketDiscovery ? { ...out.marketDiscovery, provider: out.provider, fallbackUsed: out.fallbackUsed } : null,
      audienceIntelligence: out.audienceIntelligence ? { ...out.audienceIntelligence, provider: out.provider, fallbackUsed: out.fallbackUsed } : null,
      brain: brainSummary,
    });
  } catch(e){ console.error(e); return res.status(500).json({ error: e.message, brain: brainSummary }); }
};
