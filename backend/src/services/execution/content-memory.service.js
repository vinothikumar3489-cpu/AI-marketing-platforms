import { createStableHash } from "../../utils/stable-hash.js";

export async function saveContentMemory(prisma, payload) {
  const {
    userId,
    chatId,
    assetType,
    assetId,
    evidenceGraphHash,
    promptHash,
    aiOutput,
    finalOutput,
    qualityScore,
    userEdits,
    provider,
  } = payload;

  const memoryRecord = {
    userId,
    chatId,
    assetType,
    assetId: assetId || null,
    evidenceGraphHash: evidenceGraphHash || null,
    promptHash: promptHash || null,
    aiOutputSnapshot: aiOutput ? JSON.parse(JSON.stringify(aiOutput)) : null,
    finalOutputSnapshot: finalOutput ? JSON.parse(JSON.stringify(finalOutput)) : null,
    qualityScore: qualityScore || null,
    userEdits: userEdits ? JSON.parse(JSON.stringify(userEdits)) : null,
    provider: provider || 'unknown',
    generatedAt: new Date().toISOString(),
  };

  try {
    if (prisma?.contentMemory?.create) {
      const saved = await prisma.contentMemory.create({ data: memoryRecord });
      return { success: true, id: saved.id };
    }
  } catch (e) {
    console.warn('[ContentMemory] Failed to save memory (table may not exist):', e.message);
  }

  return { success: false, reason: 'contentMemory table unavailable', memory: memoryRecord };
}

export async function getBestExampleForType(prisma, userId, assetType, minScore = 70) {
  try {
    if (prisma?.contentMemory?.findFirst) {
      return await prisma.contentMemory.findFirst({
        where: {
          userId,
          assetType,
          qualityScore: { gte: minScore },
        },
        orderBy: { qualityScore: 'desc' },
      });
    }
  } catch (e) {
    console.warn('[ContentMemory] Failed to fetch best example:', e.message);
  }
  return null;
}

export async function getRecentMemoryForType(prisma, userId, assetType, limit = 5) {
  try {
    if (prisma?.contentMemory?.findMany) {
      return await prisma.contentMemory.findMany({
        where: { userId, assetType },
        orderBy: { generatedAt: 'desc' },
        take: limit,
      });
    }
  } catch (e) {
    console.warn('[ContentMemory] Failed to fetch recent memory:', e.message);
  }
  return [];
}

export function buildEvidenceGraphHash(evidenceGraph) {
  if (!evidenceGraph) return null;
  const relevant = {
    product: evidenceGraph.product,
    audience: evidenceGraph.audience,
    competitors: evidenceGraph.competitors,
    seo: { keywords: evidenceGraph.seo?.keywords?.slice(0, 10) },
    campaign: evidenceGraph.campaign,
  };
  return createStableHash(JSON.stringify(relevant));
}

export function buildPromptHash(prompt) {
  if (!prompt) return null;
  return createStableHash(typeof prompt === 'string' ? prompt : JSON.stringify(prompt));
}

export default {
  saveContentMemory,
  getBestExampleForType,
  getRecentMemoryForType,
  buildEvidenceGraphHash,
  buildPromptHash,
};
