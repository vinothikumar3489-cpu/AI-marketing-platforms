import { getSeoByChat, runSeoAnalysis, getContentGapsByChat, runContentGapAnalysis, getBlogsByChat, runBlogAnalysis, getExecutiveDashboardByChat, runExecutiveDashboardAnalysis } from "../services/seo.service.js";
import { prisma } from "../config/prisma.js";

export async function getSeo(req, res) {
  const { chatId } = req.params;
  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user.id } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const seo = await getSeoByChat(chatId);
    return res.json({ seo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to fetch SEO data" });
  }
}

export async function runSeo(req, res) {
  const { chatId } = req.params;
  const { websiteUrl } = req.body;
  const userId = req.user?.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const seo = await runSeoAnalysis({ chatId, userId, websiteUrl, productName: chat.productName || req.body.productName });
    return res.json({ seo });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ success: false, error: "Failed to run SEO analysis" });
  }
}

// ============================================
// CONTENT GAP INTELLIGENCE
// ============================================

export async function getContentGaps(req, res) {
  const { chatId } = req.params;
  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user.id } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const contentGaps = await getContentGapsByChat(chatId);
    return res.json({ contentGaps });
  } catch (err) {
    console.error('Error fetching content gaps:', err);
    return res.status(500).json({ success: false, error: "Failed to fetch content gap data" });
  }
}

export async function runContentGaps(req, res) {
  const { chatId } = req.params;
  const userId = req.user?.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const contentGaps = await runContentGapAnalysis({ chatId, userId });
    return res.json({ contentGaps });
  } catch (err) {
    console.error('Error running content gap analysis:', err);
    return res.status(500).json({ success: false, error: "Failed to run content gap analysis" });
  }
}

// ============================================
// BLOG INTELLIGENCE
// ============================================

export async function getBlogs(req, res) {
  const { chatId } = req.params;
  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user.id } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const blogs = await getBlogsByChat(chatId);
    return res.json({ blogs });
  } catch (err) {
    console.error('Error fetching blog intelligence:', err);
    return res.status(500).json({ success: false, error: "Failed to fetch blog intelligence data" });
  }
}

export async function runBlogs(req, res) {
  const { chatId } = req.params;
  const userId = req.user?.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const blogs = await runBlogAnalysis({ chatId, userId });
    return res.json({ blogs });
  } catch (err) {
    console.error('Error running blog intelligence analysis:', err);
    return res.status(500).json({ success: false, error: "Failed to run blog intelligence analysis" });
  }
}


// ============================================
// EXECUTIVE DASHBOARD
// ============================================

export async function getExecutiveDashboard(req, res) {
  const { chatId } = req.params;
  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user.id } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const dashboard = await getExecutiveDashboardByChat(chatId);
    return res.json({ dashboard });
  } catch (err) {
    console.error('Error fetching executive dashboard:', err);
    return res.status(500).json({ success: false, error: "Failed to fetch executive dashboard" });
  }
}

export async function runExecutiveDashboard(req, res) {
  const { chatId } = req.params;
  const userId = req.user?.id;

  try {
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
    const dashboard = await runExecutiveDashboardAnalysis({ chatId, userId });
    return res.json({ dashboard });
  } catch (err) {
    console.error('Error running executive dashboard analysis:', err);
    return res.status(500).json({ success: false, error: "Failed to run executive dashboard analysis" });
  }
}
