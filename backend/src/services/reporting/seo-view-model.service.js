function toPercentScore(value) {
  if (value === null || value === undefined || value === '') return null;
  const n = Number(value);
  if (!Number.isFinite(n)) return null;
  return n <= 1 ? Math.round(n * 100) : Math.round(n);
}

export function buildSeoViewModel(data) {
  const ta = data?.technicalAudit || data?.technicalAuditDetail || {};
  const ps = ta?.auditData?.pageSpeed || {};

  const overallScore = data?.seoScore ?? ta?.overallScore ?? null;
  const performance = toPercentScore(
    ps?.mobile?.lighthouseScores?.performance ??
    ps?.desktop?.lighthouseScores?.performance ??
    ta?.performanceScore ??
    null
  );
  const accessibility = toPercentScore(
    ps?.mobile?.lighthouseScores?.accessibility ??
    ps?.desktop?.lighthouseScores?.accessibility ??
    ta?.accessibilityScore ??
    null
  );
  const bestPractices = toPercentScore(
    ps?.mobile?.lighthouseScores?.bestPractices ??
    ps?.desktop?.lighthouseScores?.bestPractices ??
    ta?.bestPracticesScore ??
    null
  );
  const lighthouseSeo = toPercentScore(
    ps?.mobile?.lighthouseScores?.seo ??
    ps?.desktop?.lighthouseScores?.seo ??
    ta?.seoScore ??
    null
  );
  const mobilePerf = toPercentScore(ps?.mobile?.performance ?? ta?.mobileScore ?? null);
  const desktopPerf = toPercentScore(ps?.desktop?.performance ?? ta?.desktopScore ?? null);

  return {
    overallScore,
    performance,
    accessibility,
    bestPractices,
    lighthouseSeo,
    mobilePerformance: mobilePerf,
    desktopPerformance: desktopPerf,
    technicalScore: ta?.technicalScore ?? null,
    contentScore: data?.contentScore ?? null,
    metadataScore: ta?.metadataScore ?? null,
    crawlabilityScore: ta?.crawlabilityScore ?? null,
    confidence: data?.confidence ?? null,
    coverage: data?.coverage ?? null,
    crux: ta?.coreWebVitals ?? ta?.chromeUX ?? null,
    scoreBreakdown: data?.scoreBreakdown ?? {},

    // Legacy aliases for backward compatibility (used by templates)
    seoScore: overallScore,
    overall: overallScore,
    performanceScore: performance,
    accessibilityScore: accessibility,
    bestPracticesScore: bestPractices,
    mobileScore: mobilePerf,
    desktopScore: desktopPerf,
  };
}
