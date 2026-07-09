import { fetchText } from "../../utils/http.util.js";
import { logEvidenceError } from "../../utils/evidence-logger.js";

export async function collectRobotsEvidence(websiteUrl) {
  const result = {
    exists: false,
    sitemapUrls: [],
    blockedPaths: [],
    crawlDelay: null,
    rulesSummary: null,
    rawContent: null,
  };

  try {
    const url = new URL(websiteUrl);
    const robotsUrl = `${url.protocol}//${url.hostname}/robots.txt`;

    const content = await fetchText(robotsUrl, 2000, 8000);
    if (!content) return result;

    result.exists = true;
    result.rawContent = content;

    const sitemapRegex = /^Sitemap:\s*(.+)$/gim;
    let match;
    while ((match = sitemapRegex.exec(content)) !== null) {
      result.sitemapUrls.push(match[1].trim());
    }

    const disallowRegex = /^Disallow:\s*(.+)$/gim;
    while ((match = disallowRegex.exec(content)) !== null) {
      const path = match[1].trim();
      if (path && path !== "") result.blockedPaths.push(path);
    }

    const delayRegex = /^Crawl-delay:\s*(\d+)/gim;
    if ((match = delayRegex.exec(content)) !== null) {
      result.crawlDelay = parseInt(match[1], 10);
    }

    const userAgentCount = (content.match(/^User-agent:/gim) || []).length;
    const allowCount = (content.match(/^Allow:/gim) || []).length;
    result.rulesSummary = `${userAgentCount} user-agent rules, ${result.blockedPaths.length} disallowed paths, ${result.sitemapUrls.length} sitemaps, ${allowCount} allow rules`;
  } catch (err) {
    logEvidenceError("robotsEvidence", websiteUrl, err);
  }

  return result;
}
