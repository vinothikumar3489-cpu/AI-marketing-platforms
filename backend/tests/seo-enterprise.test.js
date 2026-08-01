import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

before(() => {
  // Guarantee no live providers in this suite — evidence paths must degrade
  // deterministically (no fabricated metrics, no network).
  delete process.env.DATAFORSEO_LOGIN;
  delete process.env.DATAFORSEO_PASSWORD;
  delete process.env.SERPAPI_API_KEY;
  delete process.env.TAVILY_API_KEY;
  delete process.env.EXA_API_KEY;
  delete process.env.GOOGLE_CRUX_API_KEY;
  delete process.env.PAGESPEED_API_KEY;
});

after(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

// =====================
// SERP Analysis — feature preservation
// =====================
describe('SERP Analysis — evidence preservation', () => {
  it('normalizeSerpAnalysis preserves ai_overview with cited domains', async () => {
    const mod = await import('../src/providers/dataforseo.service.js');
    const items = [
      { type: 'organic', domain: 'a.com', url: 'https://a.com', title: 'A', description: 'x', rank_absolute: 1 },
      {
        type: 'ai_overview',
        description: 'An overview that cites https://a.com and https://b.com for context.',
        references: [{ url: 'https://a.com' }, { url: 'https://b.com/guide' }]
      },
      { type: 'featured_snippet', domain: 'f.com', url: 'https://f.com/x', title: 'F', description: 'snippet', rank_absolute: 1 },
      { type: 'people_also_ask', items: [{ title: 'What is X?', snippet: 'an answer' }] },
      { type: 'related_searches', items: [{ title: 'X alternatives' }] },
      { type: 'knowledge_graph', title: 'X', description: 'kg desc' },
      { type: 'local_pack', items: [{ title: 'Store', url: 'https://s.com' }] },
      { type: 'top_stories', items: [{ title: 'News', url: 'https://n.com' }] }
    ];
    const result = mod.normalizeSerpAnalysis(items, 'x', 'DataForSEO');

    assert.equal(result.organic.length, 1, 'organic items preserved');
    assert.equal(result.aiOverview.present, true, 'AI Overview must not be dropped');
    assert.ok(result.aiOverview.citedDomainCount >= 2, 'cited domains extracted from references and text');
    assert.ok(result.aiOverview.citedDomains.some(c => c.domain === 'a.com'));
    assert.equal(result.featuredSnippet.present ?? result.featuredSnippet.domain, 'f.com');
    assert.equal(result.peopleAlsoAsk.length, 1);
    assert.equal(result.relatedSearches.length, 1);
    assert.ok(result.knowledgeGraph);
    assert.ok(result.localPack);
    assert.equal(result.topStories.length, 1);
    const types = result.detectedFeatures.map(f => f.type);
    for (const t of ['ai_overview', 'featured_snippet', 'people_also_ask', 'knowledge_graph', 'related_searches', 'local_pack', 'top_stories']) {
      assert.ok(types.includes(t), `${t} must be detected`);
    }
  });

  it('normalizeSerpAnalysis returns empty honest result with no items', async () => {
    const mod = await import('../src/providers/dataforseo.service.js');
    const result = mod.normalizeSerpAnalysis([], 'x', 'DataForSEO');
    assert.equal(result.organic.length, 0);
    assert.equal(result.aiOverview, null);
    assert.equal(result.featuredSnippet, null);
    assert.equal(result.detectedFeatures.length, 0);
    assert.equal(result.status, 'unavailable');
  });
});

// =====================
// AI Visibility — evidence discipline
// =====================
describe('AI Visibility — evidence discipline', () => {
  it('degrades to estimated (never fabricated) when no providers are configured', async () => {
    const mod = await import('../src/services/seo/ai-visibility.service.js');
    const result = await mod.generateAIVisibility({
      productName: 'TestPM',
      companyName: 'TestPM Inc',
      domain: 'testpm.com',
      keywords: ['project management software'],
      websiteData: { text: 'TestPM is project management software.', title: 'TestPM' }
    });
    assert.equal(result.totalPlatforms, 5, 'all five platforms reported');
    assert.equal(result.measuredPlatforms.length, 0, 'no measured platforms without providers');
    assert.equal(result.estimatedPlatforms.length, 5, 'all platforms estimated');
    assert.equal(result.overallScore, null, 'no fabricated overall score');
    assert.equal(result.status, 'estimated');
    for (const p of result.platforms) {
      assert.equal(p.status, 'estimated');
      assert.ok(p.note, 'estimate must be explicitly labeled');
      assert.ok(p.findings.some(f => f.includes('Estimated')), 'findings must disclose estimation');
    }
  });

  it('scoreLlmVisibilityEvidence rewards answer mention and citations', async () => {
    const mod = await import('../src/services/seo/ai-visibility.service.js');
    const strong = mod.scoreLlmVisibilityEvidence({
      brandMentions: 4, queryCount: 4, answerMention: true, citingSourceCount: 5, topRelevance: 0.9, entityConsistency: 0.8
    });
    const weak = mod.scoreLlmVisibilityEvidence({
      brandMentions: 0, queryCount: 4, answerMention: false, citingSourceCount: 0, topRelevance: 0, entityConsistency: 0
    });
    assert.ok(strong.score > 60, `strong evidence should score high, got ${strong.score}`);
    assert.ok(weak.score < 15, `no evidence should score near zero, got ${weak.score}`);
    assert.ok(strong.score <= 100 && strong.score >= 0);
    assert.ok(strong.components.answerMention === true);
  });

  it('scoreAiOverviewEvidence rewards brand citation inside AI Overview', async () => {
    const mod = await import('../src/services/seo/ai-visibility.service.js');
    const cited = mod.scoreAiOverviewEvidence({
      keywordsChecked: 4, aiOverviewCount: 4, brandCitedInOverviewCount: 4, featuredSnippetCount: 1, brandRankedCount: 2
    });
    const none = mod.scoreAiOverviewEvidence({
      keywordsChecked: 4, aiOverviewCount: 0, brandCitedInOverviewCount: 0, featuredSnippetCount: 0, brandRankedCount: 0
    });
    assert.ok(cited.score >= 70, `brand cited in all overviews must score high, got ${cited.score}`);
    assert.ok(none.score <= 5, `no AI Overviews must score near zero, got ${none.score}`);
    assert.equal(cited.components.brandCitedRatio, 1);
  });

  it('estimateVisibilityFromOnPage is deterministic and bounded', async () => {
    const mod = await import('../src/services/seo/ai-visibility.service.js');
    const a = mod.estimateVisibilityFromOnPage({ text: 'TestPM is a project management tool for teams.', meta: { description: 'x'.repeat(120) } }, 'TestPM');
    const b = mod.estimateVisibilityFromOnPage({ text: '' }, 'TestPM');
    assert.ok(a > b, 'richer on-page signals must estimate higher');
    assert.ok(a >= 0 && a <= 100 && b >= 0 && b <= 100);
  });
});

// =====================
// Topic clusters & search intent — evidence-backed
// =====================
describe('Topic clusters & search intent', () => {
  const measuredKeywords = {
    primaryKeywords: [
      { keyword: 'project management software', searchVolume: 12000, keywordDifficulty: 55, intent: 'commercial' },
      { keyword: 'project management tools', searchVolume: 8000, keywordDifficulty: 60, intent: 'commercial' },
      { keyword: 'task management app', searchVolume: 5000, keywordDifficulty: 40, intent: 'transactional' },
      { keyword: 'gantt chart software', searchVolume: 3000, keywordDifficulty: 35, intent: 'commercial' },
      { keyword: 'team collaboration platform', searchVolume: 2000, keywordDifficulty: 45, intent: 'commercial' }
    ],
    secondaryKeywords: [
      { keyword: 'free project management software', searchVolume: 4000, keywordDifficulty: 30, intent: 'transactional' }
    ],
    longTailKeywords: [{ keyword: 'project management for agencies', searchVolume: 500, keywordDifficulty: 20, intent: 'informational' }]
  };

  it('buildTopicClusters clusters measured keywords with real volume evidence', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const clusters = mod.buildTopicClusters(measuredKeywords);
    assert.ok(clusters.length >= 1, 'clusters must form from measured keywords');
    const pm = clusters.find(c => c.name === 'project' || c.name === 'management');
    assert.ok(pm, 'project/management cluster should exist');
    assert.equal(pm.evidence, 'measured');
    assert.ok(pm.totalVolume > 0, 'cluster volume derived from real keyword volumes');
    assert.ok(pm.avgDifficulty != null, 'cluster difficulty derived from real keyword difficulties');
    assert.ok(pm.keywords.includes('project management software'));
  });

  it('buildTopicClusters returns honest empty result when no metrics exist', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const clusters = mod.buildTopicClusters({
      primaryKeywords: [{ keyword: 'x software' }],
      longTailKeywords: [{ keyword: 'y platform' }]
    });
    assert.ok(clusters.length === 0 || clusters.every(c => c.evidence === 'estimated'));
  });

  it('buildIntentBreakdown counts measured vs estimated intents', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const breakdown = mod.buildIntentBreakdown(measuredKeywords);
    assert.equal(breakdown.total, 7);
    assert.equal(breakdown.measuredCount, 7, 'all keywords carry declared intent');
    assert.equal(breakdown.dominantIntent, 'commercial');
    assert.ok(breakdown.distribution.commercial.count >= 4, 'four commercial keywords declared');
    assert.equal(breakdown.status, 'partially_measured');
  });

  it('buildIntentBreakdown falls back to classification without declared intent', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const breakdown = mod.buildIntentBreakdown({
      primaryKeywords: [{ keyword: 'best project management software' }, { keyword: 'project management software pricing' }]
    });
    assert.equal(breakdown.measuredCount, 0);
    assert.equal(breakdown.estimatedCount, 2);
    assert.equal(breakdown.dominantIntent, 'commercial');
    assert.equal(breakdown.status, 'estimated');
  });
});

// =====================
// Report builder — enterprise sections
// =====================
describe('SEO report builder — enterprise sections', () => {
  const technicalAudit = {
    overallScore: 65,
    scores: { overall: 65 },
    issues: {
      critical: [{ type: 'missing_title', title: 'Missing or empty page title', severity: 'critical', evidence: 'On-page crawl' }],
      high: [],
      medium: []
    },
    hasTitleTag: false,
    hasMetaDescription: true,
    hasCanonical: true,
    hasRobotsTxt: true,
    hasSitemap: true,
    hasViewport: true,
    titleLength: 55,
    schemaTypes: ['Organization', 'Product'],
    schema: { types: ['Organization', 'Product'], typeDetails: [] },
    structuredData: { types: ['Organization', 'Product'], count: 2 },
    altCoverage: 80,
    pageSpeed: {
      mobile: { lighthouseScores: { performance: 62, accessibility: 80, 'best-practices': 90, seo: 95 } }
    },
    performanceScore: 62
  };
  const keywordIntelligence = {
    primaryKeywords: [
      { keyword: 'project management software', searchVolume: 12000, keywordDifficulty: 55, intent: 'commercial' },
      { keyword: 'project management tools', searchVolume: 8000, keywordDifficulty: 60, intent: 'commercial' }
    ],
    metadata: { totalKeywords: 2 }
  };
  const aiVisibilityModule = {
    overallScore: 74,
    platforms: [
      { platform: 'ChatGPT', score: 74, status: 'measured', confidence: 80, method: 'llm_search_proxy', note: 'x', evidence: { citingSourceCount: 3, queries: ['a', 'b'] }, findings: ['Brand cited by 3 sources'] },
      { platform: 'Gemini', score: 45, status: 'measured', confidence: 75, method: 'llm_search_proxy', note: 'x', evidence: { citingSourceCount: 2 }, findings: ['Brand cited by 2 sources'] }
    ],
    totalPlatformsMeasured: 2,
    citationLikelihood: 'High',
    evidenceSummary: { brandTokens: ['TestPM'], llmSearchQueries: ['TestPM'], serpKeywordsChecked: [], totalCitedSources: 5 },
    status: 'measured'
  };
  const serpAnalysis = {
    status: 'measured',
    provider: 'DataForSEO',
    features: [{ type: 'ai_overview', available: true }],
    aiOverview: { present: true, citedDomainCount: 4, citedDomains: [{ domain: 'rival.com', url: 'https://rival.com' }], text: 'an overview' },
    featuredSnippet: null,
    ownDomainRank: null,
    ownDomain: 'testpm.com',
    organic: [{ rank: 3, domain: 'other.com' }]
  };

  it('produces confidence breakdown with provenance per section', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const report = mod.buildSEOReport({
      identity: { productName: 'TestPM' },
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence: { competitors: [{ name: 'Rival' }] },
      geoIntelligence: { aiVisibilityScore: 50 },
      contentGapIntelligence: {},
      blogIntelligence: {},
      serpAnalysis,
      aiVisibility: aiVisibilityModule,
      providers: {}
    });
    assert.equal(typeof report.confidence, 'number');
    assert.ok(report.confidenceBreakdown, 'confidenceBreakdown must exist');
    assert.equal(report.confidenceBreakdown.aiVisibility.status, 'measured');
    assert.equal(report.confidenceBreakdown.technicalSeo.status, 'measured');
    assert.ok(report.confidenceBreakdown.backlinks, 'backlinks section present');
    assert.ok(report.confidenceBreakdown.backlinks.status === 'estimated');
    assert.ok(report.confidenceBreakdown.measuredSections >= 5, 'five or more measured sections');
  });

  it('aiVisibility section exposes measured per-platform evidence', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const report = mod.buildSEOReport({
      identity: { productName: 'TestPM' },
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence: {},
      geoIntelligence: {},
      contentGapIntelligence: {},
      blogIntelligence: {},
      aiVisibility: aiVisibilityModule,
      providers: {}
    });
    assert.equal(report.aiVisibility.status, 'measured');
    assert.equal(report.aiVisibility.totalPlatformsMeasured, 2);
    assert.equal(report.aiVisibility.platforms[0].platform, 'ChatGPT');
    assert.equal(report.aiVisibility.platforms[0].status, 'measured');
    assert.ok(report.aiVisibility.platforms[0].evidence, 'evidence must be attached');
    assert.ok(report.aiVisibility.recommendations.length > 0, 'per-platform recommendations generated');
  });

  it('serpAnalysis section surfaces AI Overview and own-domain rank', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const report = mod.buildSEOReport({
      identity: {},
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence: {},
      geoIntelligence: {},
      contentGapIntelligence: {},
      blogIntelligence: {},
      serpAnalysis,
      providers: {}
    });
    assert.equal(report.serpAnalysis.status, 'measured');
    assert.ok(report.serpAnalysis.aiOverview.present);
    assert.equal(report.serpAnalysis.aiOverview.citedDomainCount, 4);
    assert.equal(report.serpAnalysis.ownDomainRank, null);
    assert.ok(report.serpAnalysis.features.some(f => f.type === 'ai_overview'));
  });

  it('recommendations carry evidence linkage and AI Overview finding', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const report = mod.buildSEOReport({
      identity: {},
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence: {},
      geoIntelligence: {},
      contentGapIntelligence: {},
      blogIntelligence: {},
      serpAnalysis,
      aiVisibility: aiVisibilityModule,
      providers: {}
    });
    const withEvidence = report.recommendations.filter(r => r.evidence);
    assert.ok(withEvidence.length > 0, 'recommendations must be evidence-linked');
    assert.ok(report.recommendations.some(r => r.message.includes('Missing or empty page title') || r.message.includes('critical')));
    assert.ok(
      report.recommendations.some(r => /AI Overview/i.test(r.message)),
      'AI Overview citation recommendation must appear when brand is not cited'
    );
    const unique = new Set(report.recommendations.map(r => r.message));
    assert.equal(unique.size, report.recommendations.length, 'recommendations must be de-duplicated');
  });

  it('topicClusters and schemaAnalysis sections are present', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const report = mod.buildSEOReport({
      identity: {},
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence: {},
      geoIntelligence: {},
      contentGapIntelligence: {},
      blogIntelligence: {},
      providers: {}
    });
    assert.ok(Array.isArray(report.topicClusters));
    assert.equal(report.schemaAnalysis.status, 'measured');
    assert.ok(report.schemaAnalysis.detectedTypes.some(t => t.type === 'Product'));
    assert.equal(report.schemaAnalysis.highValueTypes.length, 2);
  });

  it('coreWebVitals includes INP/TTFB and overall rating, preferring field data', async () => {
    const mod = await import('../src/services/seo/seo-report-builder.service.js');
    const report = mod.buildSEOReport({
      identity: {},
      technicalAudit,
      keywordIntelligence,
      competitorIntelligence: {},
      geoIntelligence: {},
      contentGapIntelligence: {},
      blogIntelligence: {},
      pageSpeed: { mobile: { lighthouseScores: { performance: 62 } }, desktop: null },
      crux: { status: 'measured', lcp: { p75: 4800 }, cls: { p75: 0.09 }, inp: { p75: 180 }, ttfb: { p75: 900 } },
      providers: {}
    });
    assert.equal(report.coreWebVitals.lcp.value, 4800, 'field LCP preferred over lab');
    assert.equal(report.coreWebVitals.lcp.rating, 'poor');
    assert.equal(report.coreWebVitals.inp.rating, 'good');
    assert.equal(report.coreWebVitals.overallRating, 'poor');
    assert.equal(report.coreWebVitals.passingCoreSet, false);
    assert.ok(report.coreWebVitals.source.includes('Chrome UX Report'));
  });
});
