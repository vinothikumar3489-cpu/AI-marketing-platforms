import prisma from '../../../config/prisma.js';

/**
 * Creates an immutable Evidence Snapshot in the database.
 * This should be called after raw data collection (scraping/APIs) finishes.
 */
export async function createEvidenceSnapshot({
  userId,
  chatId,
  analysisId,
  websiteUrl,
  companyName,
  sourceSummary,
  websiteEvidence,
  technicalSeoEvidence,
  contentEvidence,
  competitorEvidence,
  githubEvidence,
  rawEvidence
}) {
  try {
    const snapshot = await prisma.evidenceSnapshot.create({
      data: {
        userId,
        chatId,
        analysisId,
        websiteUrl,
        companyName,
        sourceSummary: sourceSummary || {},
        websiteEvidence: websiteEvidence || {},
        technicalSeoEvidence: technicalSeoEvidence || {},
        contentEvidence: contentEvidence || {},
        competitorEvidence: competitorEvidence || {},
        githubEvidence: githubEvidence || {},
        rawEvidence: rawEvidence || {}
      }
    });
    return { success: true, snapshot };
  } catch (err) {
    console.error("[EvidenceService] Error creating snapshot:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves the latest Evidence Snapshot for a specific chat.
 */
export async function getLatestEvidenceSnapshot(chatId) {
  try {
    const snapshot = await prisma.evidenceSnapshot.findFirst({
      where: { chatId },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, snapshot };
  } catch (err) {
    console.error("[EvidenceService] Error retrieving snapshot:", err);
    return { success: false, error: err.message };
  }
}
