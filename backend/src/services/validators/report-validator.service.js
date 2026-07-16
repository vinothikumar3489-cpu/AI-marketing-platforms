const SEVERITY = { INFO: 'INFO', WARNING: 'WARNING', BLOCKING: 'BLOCKING' };

export function validateReport(canonicalGrowth, canonicalSeo, reportType) {
  const issues = [];

  if (reportType === 'growth' || reportType === 'all') {
    validateGrowthPayload(canonicalGrowth, issues);
  }

  if (reportType === 'seo' || reportType === 'all') {
    validateSeoPayload(canonicalSeo, issues);
  }

  const blockingIssues = issues.filter(i => i.severity === 'BLOCKING');
  const removableSections = [];

  if (blockingIssues.length > 0) {
    const removable = identifyRemovableSections(issues, reportType);
    removableSections.push(...removable);
  }

  return {
    valid: blockingIssues.length === 0,
    issues,
    blockingIssues,
    removableSections,
    summary: {
      total: issues.length,
      blocking: blockingIssues.length,
      warnings: issues.filter(i => i.severity === 'WARNING').length,
      info: issues.filter(i => i.severity === 'INFO').length,
    },
  };
}

function validateGrowthPayload(growth, issues) {
  if (!growth) {
    issues.push({
      code: 'NO_GROWTH_DATA',
      message: 'Growth workspace data is not available',
      severity: SEVERITY.BLOCKING,
      section: 'growth',
    });
    return;
  }

  if (!growth.productIdentity || !growth.productIdentity.productName) {
    issues.push({
      code: 'PLACEHOLDER_PRODUCT_IDENTITY',
      message: 'Product identity is missing or unresolved',
      severity: SEVERITY.BLOCKING,
      section: 'company',
    });
  }

  if (growth.productIdentity && growth.productIdentity.productName === growth.productIdentity.brandName
    && !growth.productIdentity.domain) {
    issues.push({
      code: 'PLACEHOLDER_PRODUCT_IDENTITY',
      message: `Product "${growth.productIdentity.productName}" lacks distinguishing evidence`,
      severity: SEVERITY.WARNING,
      section: 'company',
    });
  }

  const hasFakeScores = growth.scores && Object.values(growth.scores).some(s => s === 100);
  if (hasFakeScores) {
    const fakeScoreKeys = Object.entries(growth.scores).filter(([, v]) => v === 100).map(([k]) => k);
    issues.push({
      code: 'UNSUPPORTED_100_SCORE',
      message: `Score(s) at 100 without evidence: ${fakeScoreKeys.join(', ')}`,
      severity: SEVERITY.BLOCKING,
      section: 'scores',
    });
  }

  const competitors = growth.competitors || [];
  const unnamedCompetitors = competitors.filter(c => {
    if (typeof c === 'string') return false;
    return !c.name && !c.domain;
  });
  if (unnamedCompetitors.length > 0) {
    issues.push({
      code: 'FAKE_COMPETITOR_DATA',
      message: `${unnamedCompetitors.length} competitor(s) without name or domain`,
      severity: SEVERITY.BLOCKING,
      section: 'competitors',
    });
  }

  if (competitors.length > 0) {
    const noSource = competitors.filter(c => !c.source && !c.sourceUrl);
    if (noSource.length > 0) {
      issues.push({
        code: 'COMPETITOR_WITHOUT_SOURCE',
        message: `${noSource.length} competitor(s) appear without source/evidence`,
        severity: SEVERITY.WARNING,
        section: 'competitors',
      });
    }
  }

  if (growth.channels && growth.channels.length === 0 && growth.evidenceCoverage?.hasChannels) {
    issues.push({
      code: 'INCOMPLETE_CHANNEL_PLAN',
      message: 'Channel plan expected but empty',
      severity: SEVERITY.WARNING,
      section: 'channels',
    });
  }

  const roadmap = growth.roadmap || {};
  const hasRoadmapItems = Object.values(roadmap).some(a => Array.isArray(a) && a.length > 0);
  if (!hasRoadmapItems && growth.evidenceCoverage?.hasCampaignData) {
    issues.push({
      code: 'GENERIC_ROADMAP',
      message: 'Implementation roadmap is empty despite campaign data existing',
      severity: SEVERITY.WARNING,
      section: 'roadmap',
    });
  }
}

function validateSeoPayload(seo, issues) {
  if (!seo) {
    issues.push({
      code: 'NO_SEO_DATA',
      message: 'SEO intelligence data is not available',
      severity: SEVERITY.BLOCKING,
      section: 'seo',
    });
    return;
  }

  const keywords = seo.keywords || [];
  const junkKeywords = keywords.filter(k => {
    const kw = (k.keyword || '').toLowerCase();
    return kw.length < 3 || /^[^a-zA-Z0-9]+$/.test(kw);
  });
  if (junkKeywords.length > 0) {
    issues.push({
      code: 'JUNK_KEYWORD',
      message: `${junkKeywords.length} junk or single-word keyword(s) found`,
      severity: SEVERITY.BLOCKING,
      section: 'keywords',
    });
  }

  const competitors = seo.competitors || [];
  if (competitors.length > 0) {
    const unvalidated = competitors.filter(c => c.validationStatus !== 'VALIDATED');
    if (unvalidated.length > 0) {
      issues.push({
        code: 'UNVALIDATED_COMPETITOR',
        message: `${unvalidated.length} competitor(s) not validated`,
        severity: SEVERITY.WARNING,
        section: 'competitors',
      });
    }
  }

  const contentGaps = seo.contentGaps || [];
  const hasGenericGaps = contentGaps.some(g => {
    const topic = (g.topic || '').toLowerCase();
    return topic.length < 5 || topic.includes('complete guide for');
  });
  if (hasGenericGaps) {
    issues.push({
      code: 'INVALID_CONTENT_GAP',
      message: 'Content gaps contain template/generic entries',
      severity: SEVERITY.BLOCKING,
      section: 'contentGaps',
    });
  }

  const actionPlan = seo.actionPlan || [];
  const genericActions = actionPlan.filter(a => {
    const title = (a.title || '').toLowerCase();
    return title.length < 10 || title.includes('review technical seo') || title.includes('review ai search');
  });
  if (genericActions.length > 0 && genericActions.length === actionPlan.length) {
    issues.push({
      code: 'GENERIC_ACTION_PLAN',
      message: 'All action plan items are generic/templated',
      severity: SEVERITY.BLOCKING,
      section: 'actionPlan',
    });
  }

  if (seo.dataCompleteness) {
    const dc = seo.dataCompleteness;
    if (dc.hasKeywords && keywords.length === 0) {
      issues.push({
        code: 'CONTRADICTORY_COUNT',
        message: 'dataCompleteness reports keywords but keyword array is empty',
        severity: SEVERITY.BLOCKING,
        section: 'keywords',
      });
    }
    if (dc.hasCompetitors && competitors.length === 0) {
      issues.push({
        code: 'CONTRADICTORY_COUNT',
        message: 'dataCompleteness reports competitors but competitor array is empty',
        severity: SEVERITY.BLOCKING,
        section: 'competitors',
      });
    }
  }

  const aiSearch = seo.aiSearchReadiness || {};
  if (aiSearch.inferenceStatus === 'MEASURED' && !aiSearch.overallScore && !aiSearch.platforms) {
    issues.push({
      code: 'UNSUPPORTED_GEO_SCORE',
      message: 'GEO marked as measured but no measured values exist',
      severity: SEVERITY.WARNING,
      section: 'aiSearchReadiness',
    });
  }
}

function identifyRemovableSections(issues, reportType) {
  const sections = new Set();
  for (const issue of issues) {
    if (issue.severity === 'BLOCKING') {
      sections.add(issue.section);
    }
  }

  const sectionToTab = {
    scores: 'scores',
    competitors: reportType === 'seo' ? 'competitors' : 'competitors',
    keywords: 'keywords',
    contentGaps: 'contentGaps',
    actionPlan: 'actionPlan',
    company: 'company',
    channels: 'channels',
    roadmap: 'roadmap',
    aiSearchReadiness: 'aiSearchReadiness',
  };

  const removable = [];
  for (const section of sections) {
    const tab = sectionToTab[section];
    if (tab) removable.push({ section: tab, reason: `Removed due to: ${section}` });
  }

  return removable;
}

export function validateAndFilterSections(payload, reportType) {
  const validation = validateReport(payload?.canonicalGrowth, payload?.canonicalSeo, reportType);

  if (validation.blockingIssues.length === 0) {
    return { payload, validation };
  }

  const filtered = { ...payload };
  const sectionsToRemove = new Set(validation.removableSections.map(r => r.section));

  if (filtered.canonicalGrowth) {
    if (sectionsToRemove.has('scores')) filtered.canonicalGrowth.scores = {};
    if (sectionsToRemove.has('competitors')) filtered.canonicalGrowth.competitors = [];
    if (sectionsToRemove.has('roadmap')) filtered.canonicalGrowth.roadmap = {};
    if (sectionsToRemove.has('channels')) filtered.canonicalGrowth.channels = [];
  }

  if (filtered.canonicalSeo) {
    if (sectionsToRemove.has('keywords')) filtered.canonicalSeo.keywords = [];
    if (sectionsToRemove.has('competitors')) filtered.canonicalSeo.competitors = [];
    if (sectionsToRemove.has('contentGaps')) filtered.canonicalSeo.contentGaps = [];
    if (sectionsToRemove.has('actionPlan')) filtered.canonicalSeo.actionPlan = [];
    if (sectionsToRemove.has('aiSearchReadiness')) filtered.canonicalSeo.aiSearchReadiness = {};
  }

  const remainingBlocking = validateReport(filtered?.canonicalGrowth, filtered?.canonicalSeo, reportType);
  if (remainingBlocking.blockingIssues.length > 0) {
    return { payload, validation };
  }

  return { payload: filtered, validation: remainingBlocking };
}
