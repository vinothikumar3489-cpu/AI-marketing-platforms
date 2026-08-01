import { getPageSpeedAudit } from "../../providers/pagespeed.service.js";
import { logEvidenceError } from "../../utils/evidence-logger.js";

/**
 * PageSpeed evidence collector.
 *
 * Routes through the single shared PageSpeed provider (providers/pagespeed.service.js)
 * so there is exactly ONE implementation and ONE cache key space in the pipeline:
 * the research orchestrator, the evidence module and the technical-SEO analyzer all
 * share the same 5-minute cached audit — no duplicate API calls for the same URL.
 *
 * Output shape is preserved for backward compatibility with evidence.normalizer.
 */
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
    source: 'pagespeed_api',
    error: null,
  };

  try {
    const audit = await getPageSpeedAudit(websiteUrl, 'mobile');

    if (!audit.success || !audit.data) {
      result.error = audit.error || 'PageSpeed API request failed';
      return result;
    }

    const data = audit.data;
    const scores = data.lighthouseScores || {};

    result.performanceScore = scores.performance ?? null;
    result.accessibilityScore = scores.accessibility ?? null;
    result.bestPracticesScore = scores.bestPractices ?? null;
    result.seoScore = scores.seo ?? null;

    const vitals = data.coreWebVitals || {};
    result.lcp = vitals.lcp ?? null;
    result.cls = vitals.cls ?? null;
    result.inp = vitals.inp ?? null;
    result.ttfb = vitals.ttfb ?? null;

    result.topOpportunities = (data.opportunities || []).slice(0, 10).map((o) => ({
      title: o.title || null,
      score: o.score != null ? Math.round(o.score * 100) : null,
      description: (o.description || "").slice(0, 300) || null,
      items: [],
    }));

    result.diagnostics = (data.diagnostics || []).slice(0, 15).map((d) => ({
      title: d.title || null,
      description: (d.description || "").slice(0, 200) || null,
    }));
  } catch (err) {
    logEvidenceError("pageSpeedEvidence", websiteUrl, err);
    result.error = err.message || "PageSpeed API request failed";
  }

  return result;
}
