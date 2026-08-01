import prisma from '../../../config/prisma.js';
import { upsertEvidenceSnapshot } from '../../../modules/evidence/evidence.service.js';

/**
 * Creates/updates the canonical Evidence Snapshot for a (chat, user, websiteUrl).
 * This is the single write path used after raw data collection (scraping/APIs).
 * A later write NEVER overwrites populated values with null / {} / [] / "" —
 * incoming data is deep-merged into the existing row.
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
    const snapshot = await upsertEvidenceSnapshot({
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
    });
    if (!snapshot) return { success: false, error: 'Snapshot write failed' };
    return { success: true, snapshot };
  } catch (err) {
    console.error("[EvidenceService] Error creating snapshot:", err);
    return { success: false, error: err.message };
  }
}

/**
 * Retrieves the latest Evidence Snapshot for a specific chat.
 * Pass `userId` to scope the lookup to the requesting user.
 */
export async function getLatestEvidenceSnapshot(chatId, userId) {
  try {
    const snapshot = await prisma.evidenceSnapshot.findFirst({
      where: { chatId, ...(userId ? { userId } : {}) },
      orderBy: { createdAt: 'desc' }
    });
    return { success: true, snapshot };
  } catch (err) {
    console.error("[EvidenceService] Error retrieving snapshot:", err);
    return { success: false, error: err.message };
  }
}
