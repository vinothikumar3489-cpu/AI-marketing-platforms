import { fetchJson } from "../../utils/http.util.js";
import { logEvidenceError } from "../../utils/evidence-logger.js";

export async function collectPageSpeedEvidence(websiteUrl) {
  const result = {
    performanceScore: null,
    accessibilityScore: null,
    bestPracticesScore: null,
    seoScore: null,
    lcp: null,
    cls: null,
    inp: null,
    ttfb: null,
    topOpportunities: [],
    diagnostics: [],
    error: null,
  };

  const apiKey = process.env.GOOGLE_PAGESPEED_INSIGHTS_API_KEY || process.env.PAGESPEED_API_KEY || null;
  if (!apiKey) {
    result.error = "No API key configured (set GOOGLE_PAGESPEED_INSIGHTS_API_KEY or PAGESPEED_API_KEY)";
    return result;
  }

  try {
    const apiUrl = `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${encodeURIComponent(websiteUrl)}&key=${apiKey}&strategy=mobile&category=PERFORMANCE&category=ACCESSIBILITY&category=BEST_PRACTICES&category=SEO`;

    const data = await fetchJson(apiUrl, 30000);
    if (!data || !data.lighthouseResult) {
      result.error = "PageSpeed API returned no lighthouse result";
      return result;
    }

    const lh = data.lighthouseResult;
    const categories = lh.categories || {};
    const audits = lh.audits || {};

    result.performanceScore = categories.performance?.score != null ? Math.round(categories.performance.score * 100) : null;
    result.accessibilityScore = categories.accessibility?.score != null ? Math.round(categories.accessibility.score * 100) : null;
    result.bestPracticesScore = categories["best-practices"]?.score != null ? Math.round(categories["best-practices"].score * 100) : null;
    result.seoScore = categories.seo?.score != null ? Math.round(categories.seo.score * 100) : null;

    result.lcp = audits["largest-contentful-paint"]?.numericValue || null;
    result.cls = audits["cumulative-layout-shift"]?.numericValue || null;
    result.inp = audits["interaction-to-next-paint"]?.numericValue || null;
    result.ttfb = audits["server-response-time"]?.numericValue || null;

    const opps = [];
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.score != null && audit.score < 1 && audit.title && audit.details?.items) {
        opps.push({
          title: audit.title,
          score: Math.round(audit.score * 100),
          description: audit.description?.slice(0, 300) || null,
          items: audit.details.items.slice(0, 3).map(item => ({
            url: item.url || null,
            wastedMs: item.wastedMs || null,
            totalBytes: item.totalBytes || null,
          })),
        });
      }
    }
    opps.sort((a, b) => a.score - b.score);
    result.topOpportunities = opps.slice(0, 10);

    const diags = [];
    for (const [key, audit] of Object.entries(audits)) {
      if (audit.scoreDisplayMode === "informative" && audit.title) {
        diags.push({
          title: audit.title,
          description: audit.description?.slice(0, 200) || null,
        });
      }
    }
    result.diagnostics = diags.slice(0, 15);
  } catch (err) {
    logEvidenceError("pageSpeedEvidence", websiteUrl, err);
    result.error = err.message || "PageSpeed API request failed";
  }

  return result;
}
