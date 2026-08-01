import prisma from "../../config/prisma.js";
import { collectWebsiteEvidence } from "./websiteEvidence.service.js";
import { collectRobotsEvidence } from "./robotsEvidence.service.js";
import { collectSitemapEvidence } from "./sitemapEvidence.service.js";
import { collectPageSpeedEvidence } from "./pageSpeedEvidence.service.js";
import { collectGitHubEvidence } from "./githubEvidence.service.js";
import { collectTechnologyEvidence } from "./technologyEvidence.service.js";
import { normalizeEvidenceResponse, buildEvidenceContext } from "./evidence.normalizer.js";
import { logEvidenceError, logEvidenceInfo } from "../../utils/evidence-logger.js";

export async function getLatestEvidenceSnapshot({ chatId, userId }) {
  try {
    const snapshot = await prisma.evidenceSnapshot.findFirst({
      where: { chatId, userId },
      orderBy: { createdAt: 'desc' },
    });
    return snapshot;
  } catch (err) {
    logEvidenceError("getLatestEvidenceSnapshot", null, err, { userId, chatId });
    return null;
  }
}

// ===== SNAPSHOT MERGE SEMANTICS =====
// A chat produces exactly ONE EvidenceSnapshot per (chatId, userId, websiteUrl).
// Every writer goes through upsertEvidenceSnapshot which merges incoming evidence
// into the existing row. Populated values always win — a later, emptier write can
// never overwrite richer data with null / {} / [] / "".

export function normalizeWebsiteUrl(url) {
  if (!url || typeof url !== 'string') return url || null;
  try {
    const u = new URL(url.startsWith('http') ? url : `https://${url}`);
    u.hash = '';
    return u.href.replace(/\/+$/, '');
  } catch {
    return url.trim().replace(/\/+$/, '');
  }
}

function isPopulated(value) {
  if (value === null || value === undefined) return false;
  if (typeof value === 'string') return value.trim().length > 0;
  if (Array.isArray(value)) return value.length > 0;
  if (typeof value === 'object') return Object.keys(value).length > 0;
  return true; // numbers and booleans are always real measurements
}

export function deepMergeEvidence(existing, incoming) {
  if (!isPopulated(incoming)) return existing ?? null;
  if (!isPopulated(existing)) return incoming ?? null;
  if (typeof existing !== 'object' || typeof incoming !== 'object') return existing;
  if (Array.isArray(existing) || Array.isArray(incoming)) return existing;
  const out = { ...existing };
  for (const [key, value] of Object.entries(incoming)) {
    if (value === undefined) continue;
    if (!(key in out) || !isPopulated(out[key])) {
      out[key] = value;
    } else if (typeof out[key] === 'object' && !Array.isArray(out[key]) && typeof value === 'object' && !Array.isArray(value)) {
      out[key] = deepMergeEvidence(out[key], value);
    }
  }
  return out;
}

function mergeSourceSummaries(existing, incoming) {
  if (!isPopulated(existing)) return incoming ?? null;
  if (!isPopulated(incoming)) return existing ?? null;
  const union = (a = [], b = []) => [...new Set([...(a || []), ...(b || [])])];
  const merged = {
    sourcesCollected: union(existing.sourcesCollected, incoming.sourcesCollected),
    missingSources: union(existing.missingSources, incoming.missingSources),
  };
  if (incoming.collectedAt) merged.collectedAt = incoming.collectedAt;
  return merged;
}

export async function upsertEvidenceSnapshot({
  chatId, userId, analysisId, websiteUrl, companyName,
  sourceSummary, websiteEvidence, technicalSeoEvidence, contentEvidence,
  competitorEvidence, githubEvidence, rawEvidence,
}) {
  try {
    const normalizedUrl = normalizeWebsiteUrl(websiteUrl);
    if (!chatId || !userId || !normalizedUrl) {
      logEvidenceError("upsertEvidenceSnapshot", websiteUrl, new Error('chatId, userId and websiteUrl are required'), { userId, chatId });
      return null;
    }

    const incoming = {
      chatId,
      userId,
      analysisId: analysisId || null,
      websiteUrl: normalizedUrl,
      companyName: companyName || null,
      sourceSummary: sourceSummary || null,
      websiteEvidence: websiteEvidence || null,
      technicalSeoEvidence: technicalSeoEvidence || null,
      contentEvidence: contentEvidence || null,
      competitorEvidence: competitorEvidence || null,
      githubEvidence: githubEvidence || null,
      rawEvidence: rawEvidence || null,
    };

    const snapshot = await prisma.$transaction(async (tx) => {
      const existing = await tx.evidenceSnapshot.findFirst({
        where: { chatId, userId, websiteUrl: normalizedUrl },
        orderBy: { createdAt: 'desc' },
      });

      if (!existing) {
        return tx.evidenceSnapshot.create({
          data: {
            chatId, userId,
            analysisId: incoming.analysisId,
            websiteUrl: normalizedUrl,
            companyName: incoming.companyName,
            sourceSummary: incoming.sourceSummary,
            websiteEvidence: incoming.websiteEvidence,
            technicalSeoEvidence: incoming.technicalSeoEvidence,
            contentEvidence: incoming.contentEvidence,
            competitorEvidence: incoming.competitorEvidence,
            githubEvidence: incoming.githubEvidence,
            rawEvidence: incoming.rawEvidence,
          },
        });
      }

      return tx.evidenceSnapshot.update({
        where: { id: existing.id },
        data: {
          analysisId: existing.analysisId || incoming.analysisId,
          companyName: isPopulated(existing.companyName) ? existing.companyName : incoming.companyName,
          sourceSummary: mergeSourceSummaries(existing.sourceSummary, incoming.sourceSummary),
          websiteEvidence: deepMergeEvidence(existing.websiteEvidence, incoming.websiteEvidence),
          technicalSeoEvidence: deepMergeEvidence(existing.technicalSeoEvidence, incoming.technicalSeoEvidence),
          contentEvidence: deepMergeEvidence(existing.contentEvidence, incoming.contentEvidence),
          competitorEvidence: deepMergeEvidence(existing.competitorEvidence, incoming.competitorEvidence),
          githubEvidence: deepMergeEvidence(existing.githubEvidence, incoming.githubEvidence),
          rawEvidence: deepMergeEvidence(existing.rawEvidence, incoming.rawEvidence),
          updatedAt: new Date(),
        },
      });
    });

    logEvidenceInfo("upsertEvidenceSnapshot", normalizedUrl, "Snapshot upserted", { userId, chatId, snapshotId: snapshot.id });

    // New evidence landed → drop the cached evidence graph so downstream
    // modules (content studio, campaign, growth) never consume stale context.
    try {
      const { invalidateCache } = await import('../../services/execution/unified-evidence-graph.service.js');
      invalidateCache(userId, chatId);
    } catch { /* cache invalidation is best-effort */ }

    return snapshot;
  } catch (error) {
    logEvidenceError("upsertEvidenceSnapshot", websiteUrl, error, { userId, chatId });
    return null;
  }
}

export async function collectEvidence(websiteUrl, options = {}) {
  const { companyName } = options;

  const raw = {
    website: null,
    openGraph: null,
    schemas: null,
    robots: null,
    sitemap: null,
    pageSpeed: null,
    github: null,
    technology: null,
  };

  // One bounded retry for transient sub-source failures (robots/sitemap/etc.
  // are cheap fetches; a single network blip should not lose the evidence).
  async function withRetry(collector, label) {
    try {
      const first = await collector();
      if (!first || first.error) {
        const second = await collector();
        return second || first;
      }
      return first;
    } catch (err) {
      logEvidenceError(label, websiteUrl, err);
      try {
        return await collector();
      } catch {
        return null;
      }
    }
  }

  let $ = null;
  try {
    const cheerio = await import("cheerio");
    const scraperModule = await import("../../domains/research/services/scraper.service.js");
    const scrapeResult = await scraperModule.scrapeWebsite({ websiteUrl, companyName: companyName || "" });
    if (scrapeResult.success && scrapeResult.scrapedData?.html) {
      $ = cheerio.load(scrapeResult.scrapedData.html);

      raw.website = await collectWebsiteEvidence($, websiteUrl);
      raw.openGraph = raw.website?.openGraph || null;
      raw.schemas = raw.website?.schemas || null;
      raw.technology = collectTechnologyEvidence($);

      const githubUrls = raw.website?.githubUrls || [];

      const [robotsResult, sitemapResult, pageSpeedResult, githubResult] = await Promise.all([
        withRetry(() => collectRobotsEvidence(websiteUrl), "robotsEvidence"),
        withRetry(() => collectSitemapEvidence(websiteUrl), "sitemapEvidence"),
        withRetry(() => collectPageSpeedEvidence(websiteUrl), "pageSpeedEvidence"),
        githubUrls.length > 0
          ? withRetry(() => collectGitHubEvidence(githubUrls), "githubEvidence")
          : Promise.resolve({ repos: [], error: null }),
      ]);

      raw.robots = robotsResult;
      raw.sitemap = sitemapResult;
      raw.pageSpeed = pageSpeedResult;
      raw.github = githubResult;
      logEvidenceInfo("collectEvidence", websiteUrl, "Full evidence collection completed");
    } else {
      const [robotsResult, sitemapResult, pageSpeedResult] = await Promise.all([
        withRetry(() => collectRobotsEvidence(websiteUrl), "robotsEvidence"),
        withRetry(() => collectSitemapEvidence(websiteUrl), "sitemapEvidence"),
        withRetry(() => collectPageSpeedEvidence(websiteUrl), "pageSpeedEvidence"),
      ]);
      raw.robots = robotsResult;
      raw.sitemap = sitemapResult;
      raw.pageSpeed = pageSpeedResult;
      raw.website = { title: scrapeResult.scrapedData?.title || null, metaDescription: scrapeResult.scrapedData?.metaDescription || null };
      logEvidenceInfo("collectEvidence", websiteUrl, "Partial evidence (no HTML scraping)");
    }
  } catch (err) {
    logEvidenceError("collectEvidence", websiteUrl, err);
    const [robotsResult, sitemapResult, pageSpeedResult] = await Promise.all([
      withRetry(() => collectRobotsEvidence(websiteUrl), "robotsEvidence"),
      withRetry(() => collectSitemapEvidence(websiteUrl), "sitemapEvidence"),
      withRetry(() => collectPageSpeedEvidence(websiteUrl), "pageSpeedEvidence"),
    ]);
    raw.robots = robotsResult;
    raw.sitemap = sitemapResult;
    raw.pageSpeed = pageSpeedResult;
  }

  const normalized = normalizeEvidenceResponse(raw);
  const contextString = buildEvidenceContext(normalized.evidence);

  const totalSources = normalized.sourcesCollected.length + normalized.missingSources.length;
  const completenessScore = totalSources > 0 ? Math.round((normalized.sourcesCollected.length / totalSources) * 100) : 0;

  return {
    success: true,
    evidence: normalized.evidence,
    contextString,
    sourcesCollected: normalized.sourcesCollected,
    missingSources: normalized.missingSources,
    confidence: completenessScore,
    raw,
  };
}

export async function saveEvidenceSnapshot({ chatId, userId, analysisId, websiteUrl, companyName, evidence, sourcesCollected, rawEvidence }) {
  try {
    const snapshotData = {
      websiteEvidence: evidence.website || null,
      contentEvidence: {
        openGraph: evidence.openGraph || null,
        schemas: evidence.schemas || null,
        technology: evidence.technology || null,
        keywords: evidence.keywords || null,
      },
      technicalSeoEvidence: {
        robots: evidence.robots || null,
        sitemap: evidence.sitemap || null,
        pageSpeed: evidence.pageSpeed || null,
      },
      githubEvidence: evidence.github || null,
      sourceSummary: {
        sourcesCollected: sourcesCollected || [],
        collectedAt: new Date().toISOString(),
      },
      // Preserve the raw scrape payload when available — never let a
      // reconstruction write drop the original HTML/text evidence.
      rawEvidence: rawEvidence || (evidence.website && (evidence.website.html || evidence.website.text || evidence.website.rawMarkdown || evidence.website.scrapeQuality)
        ? {
            html: evidence.website.html || null,
            text: evidence.website.text || evidence.website.rawMarkdown || null,
            rawMarkdown: evidence.website.rawMarkdown || null,
            scrapeQuality: evidence.website.scrapeQuality || null,
          }
        : null),
    };

    return await upsertEvidenceSnapshot({
      chatId,
      userId,
      analysisId,
      websiteUrl,
      companyName,
      sourceSummary: snapshotData.sourceSummary,
      websiteEvidence: snapshotData.websiteEvidence,
      technicalSeoEvidence: snapshotData.technicalSeoEvidence,
      contentEvidence: snapshotData.contentEvidence,
      githubEvidence: snapshotData.githubEvidence,
      rawEvidence: snapshotData.rawEvidence,
    });
  } catch (error) {
    logEvidenceError("saveEvidenceSnapshot", websiteUrl, error, { userId, chatId });
    return null;
  }
}
