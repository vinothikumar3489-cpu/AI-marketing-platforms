
import { runMarketDiscovery } from "./marketDiscovery.service.js";
import { prisma } from "../../../config/prisma.js";

export const runMarketDiscoveryHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const input = req.body || {};

  if (!chatId || !userId) {
    return res.status(400).json({ error: "Missing chatId or user" });
  }

  // Ensure chat exists, create if not
  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.create({
        data: {
          id: chatId,
          userId,
          title: input.productName || "New Market Discovery",
          productName: input.productName
        }
      });
    }
  } catch (e) {
    console.error("Error checking/creating chat:", e);
  }

  try {
    const out = await runMarketDiscovery({ chatId, userId, input });
    if (!out.success) {
      return res.status(400).json(out);
    }
    return res.json({
      success: true,
      marketDiscovery: out.result
    });
  } catch (e) {
    console.error("runMarketDiscoveryHandler", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
};

export const getMarketDiscoveryHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) {
    return res.status(400).json({ error: "Missing chatId or user" });
  }

  try {
    const pi = await prisma.productIntelligence.findUnique({ where: { chatId } });
    if (!pi || pi.userId !== userId) {
      return res.json({ success: false, marketDiscovery: null });
    }

    // Include provider and fallbackUsed in response
    const md = pi.marketDiscovery;
    const response = md ? {
      ...md,
      provider: pi.provider,
      fallbackUsed: pi.fallbackUsed
    } : null;

    return res.json({ success: true, marketDiscovery: response });
  } catch (e) {
    console.error("getMarketDiscoveryHandler", e);
    return res.status(500).json({ error: e?.message || "Internal error" });
  }
};

