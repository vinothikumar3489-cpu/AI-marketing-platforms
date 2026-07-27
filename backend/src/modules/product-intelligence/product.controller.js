
import { runProductAnalysisForPI, runAudienceAnalysis, getProductIntelligence } from "./product.service.js";
import prisma from "../../config/prisma.js";

export const runProductHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};
  if (!chatId || !userId) return res.status(400).json({ error: 'Missing chatId or user' });
  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.create({
        data: { id: chatId, userId, title: input.productName || 'New Product Intelligence', productName: input.productName }
      });
    }
    const out = await runProductAnalysisForPI({ chatId, userId, input });
    if (!out.success) return res.status(400).json(out);
    return res.json({ success: true, productAnalysis: out.analysis });
  } catch(e){ console.error(e); return res.status(500).json({ error: e.message }); }
};

export const runAudienceHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id; const input = req.body || {};
  if (!chatId || !userId) return res.status(400).json({ error: 'Missing chatId or user' });
  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.create({
        data: { id: chatId, userId, title: input.productName || 'New Audience Intelligence', productName: input.productName }
      });
    }
    const out = await runAudienceAnalysis({ chatId, userId, input });
    if (!out.success) return res.status(400).json(out);
    return res.json({ success: true, audienceIntelligence: out.audience });
  } catch(e){ console.error(e); return res.status(500).json({ error: e.message }); }
};

export const getProductIntelligenceHandler = async (req, res) => {
  const { chatId } = req.params; const userId = req.user?.id;
  try {
    const out = await getProductIntelligence({ chatId, userId });
    if (!out || out.userId !== userId) return res.json({ success:false, productAnalysis: null, marketDiscovery: null, audienceIntelligence: null });
    return res.json({
      success:true,
      productAnalysis: out.productAnalysis ? { ...out.productAnalysis, provider: out.provider, fallbackUsed: out.fallbackUsed } : null,
      marketDiscovery: out.marketDiscovery ? { ...out.marketDiscovery, provider: out.provider, fallbackUsed: out.fallbackUsed } : null,
      audienceIntelligence: out.audienceIntelligence ? { ...out.audienceIntelligence, provider: out.provider, fallbackUsed: out.fallbackUsed } : null
    });
  } catch(e){ console.error(e); return res.status(500).json({ error: e.message }); }
};
