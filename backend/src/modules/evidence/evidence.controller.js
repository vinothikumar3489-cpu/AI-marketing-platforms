import { prisma } from "../../config/prisma.js";
import { collectEvidence } from "./evidence.service.js";

export const collectEvidenceHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;
  const { websiteUrl, companyName } = req.body;

  if (!websiteUrl) {
    return res.status(400).json({ success: false, error: "websiteUrl is required" });
  }

  // Validate the chat belongs to the user
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  try {
    const result = await collectEvidence(websiteUrl, { companyName });

    if (!result.success) {
      return res.status(500).json({ success: false, error: "Evidence collection failed" });
    }

    // Store the snapshot
    const snapshot = await prisma.evidenceSnapshot.create({
      data: {
        userId,
        chatId,
        websiteUrl,
        companyName: companyName || null,
        sourceSummary: {
          sourcesCollected: result.sourcesCollected,
          missingSources: result.missingSources,
        },
        websiteEvidence: result.evidence?.website || null,
        technicalSeoEvidence: {
          pageSpeed: result.evidence?.pageSpeed || null,
          robots: result.evidence?.robots || null,
          sitemap: result.evidence?.sitemap || null,
        },
        contentEvidence: {
          openGraph: result.evidence?.openGraph || null,
          schemas: result.evidence?.schemas || null,
          technology: result.evidence?.technology || null,
        },
        githubEvidence: result.evidence?.github || null,
        rawEvidence: {
          sourcesCollected: result.sourcesCollected,
          missingSources: result.missingSources,
          contextString: result.contextString,
        },
      },
    });

    return res.json({
      success: true,
      evidenceSnapshot: snapshot,
      sourcesCollected: result.sourcesCollected,
      missingSources: result.missingSources,
    });
  } catch (error) {
    console.error(`[Evidence] Collection error:`, error.message);
    return res.status(500).json({ success: false, error: error.message || "Evidence collection failed" });
  }
};

export const getEvidenceHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user.id;

  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) {
    return res.status(404).json({ success: false, error: "Chat not found" });
  }

  const snapshots = await prisma.evidenceSnapshot.findMany({
    where: { chatId, userId },
    orderBy: { createdAt: "desc" },
    take: 5,
  });

  return res.json({ success: true, snapshots });
};
