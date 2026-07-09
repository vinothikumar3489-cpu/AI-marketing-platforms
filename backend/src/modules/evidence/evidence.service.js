import { prisma } from '../../config/prisma.js';
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

  let $ = null;
  try {
    const cheerio = await import("cheerio");
    const scraperModule = await import("../../services/scraper.service.js");
    const scrapeResult = await scraperModule.scrapeWebsite({ websiteUrl, companyName: companyName || "" });
    if (scrapeResult.success && scrapeResult.scrapedData?.html) {
      $ = cheerio.load(scrapeResult.scrapedData.html);

      raw.website = await collectWebsiteEvidence($, websiteUrl);
      raw.openGraph = raw.website?.openGraph || null;
      raw.schemas = raw.website?.schemas || null;
      raw.technology = collectTechnologyEvidence($);

      const githubUrls = raw.website?.githubUrls || [];

      const [robotsResult, sitemapResult, pageSpeedResult, githubResult] = await Promise.all([
        collectRobotsEvidence(websiteUrl),
        collectSitemapEvidence(websiteUrl),
        collectPageSpeedEvidence(websiteUrl),
        githubUrls.length > 0 ? collectGitHubEvidence(githubUrls) : Promise.resolve({ repos: [], error: null }),
      ]);

      raw.robots = robotsResult;
      raw.sitemap = sitemapResult;
      raw.pageSpeed = pageSpeedResult;
      raw.github = githubResult;
      logEvidenceInfo("collectEvidence", websiteUrl, "Full evidence collection completed");
    } else {
      const [robotsResult, sitemapResult, pageSpeedResult] = await Promise.all([
        collectRobotsEvidence(websiteUrl),
        collectSitemapEvidence(websiteUrl),
        collectPageSpeedEvidence(websiteUrl),
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
      collectRobotsEvidence(websiteUrl),
      collectSitemapEvidence(websiteUrl),
      collectPageSpeedEvidence(websiteUrl),
    ]);
    raw.robots = robotsResult;
    raw.sitemap = sitemapResult;
    raw.pageSpeed = pageSpeedResult;
  }

  const normalized = normalizeEvidenceResponse(raw);
  const contextString = buildEvidenceContext(normalized.evidence);

  return {
    success: true,
    evidence: normalized.evidence,
    contextString,
    sourcesCollected: normalized.sourcesCollected,
    missingSources: normalized.missingSources,
    raw,
  };
}

export async function saveEvidenceSnapshot({ chatId, userId, analysisId, websiteUrl, companyName, evidence, sourcesCollected }) {
  try {
    const snapshotData = {
      websiteEvidence: evidence.website || null,
      contentEvidence: {
        openGraph: evidence.openGraph || null,
        schemas: evidence.schemas || null,
        technology: evidence.technology || null,
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
      rawEvidence: null,
    };

    const snapshot = await prisma.evidenceSnapshot.create({
      data: {
        chatId,
        userId,
        analysisId: analysisId || null,
        websiteUrl,
        companyName: companyName || null,
        sourceSummary: snapshotData.sourceSummary,
        websiteEvidence: snapshotData.websiteEvidence,
        technicalSeoEvidence: snapshotData.technicalSeoEvidence,
        contentEvidence: snapshotData.contentEvidence,
        githubEvidence: snapshotData.githubEvidence,
        rawEvidence: snapshotData,
      },
    });

    logEvidenceInfo("saveEvidenceSnapshot", websiteUrl, "Snapshot saved", { userId, chatId });
    return snapshot;
  } catch (error) {
    logEvidenceError("saveEvidenceSnapshot", websiteUrl, error, { userId, chatId });
    return null;
  }
}
