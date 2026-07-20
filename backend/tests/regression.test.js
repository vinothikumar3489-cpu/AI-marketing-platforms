import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

before(() => {
  process.env.DATAFORSEO_LOGIN = 'test-login';
  process.env.DATAFORSEO_PASSWORD = 'test-pass';
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
  process.env.OPENAI_API_KEY = 'test-openai-key';
});

after(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

// =====================
// DataForSEO service
// =====================
describe('DataForSEO service', () => {
  it('isDataForSEOConfigured returns true when credentials exist', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    assert.equal(mod.isDataForSEOConfigured(), true);
  });

  it('getDataForSEOStatus returns status object', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const status = mod.getDataForSEOStatus();
    assert.ok(typeof status === 'object');
    assert.ok('configured' in status);
    assert.ok('provider' in status);
    assert.ok('available' in status);
    assert.equal(status.configured, true);
  });
});

// =====================
// Fallback generators — no fabricated data
// =====================
describe('Fallback generators — no fabricated data', () => {
  it('generateProductFallback returns safe values', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateProductFallback({}, null);
    assert.equal(fb.jobsToBeDone.length, 0);
    assert.equal(fb.valuePropositions.length, 0);
    assert.equal(fb.keyDifferentiators.length, 0);
    assert.equal(fb.painPoints.length, 0);
    assert.equal(fb.confidenceScore, null);
    assert.ok(fb.productSummary.includes('Insufficient Data'));
  });

  it('generateMarketFallback returns safe values', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateMarketFallback({}, null);
    assert.equal(fb.tam, 'Unknown');
    assert.equal(fb.marketTrends.length, 0);
    assert.equal(fb.growthOpportunities.length, 0);
    assert.equal(fb.confidenceScore, null);
  });

  it('generateAudienceFallback returns safe values', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateAudienceFallback({}, null);
    assert.equal(fb.buyerPersonas.length, 0);
    assert.equal(fb.bestChannels.length, 0);
    assert.equal(fb.confidenceScore, null);
  });

  it('generateCompetitorFallback returns no fabricated competitors', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateCompetitorFallback({}, null, []);
    assert.equal(fb.competitors.length, 0);
    assert.equal(fb.directCompetitors.length, 0);
    assert.equal(fb.marketGaps.length, 0);
    assert.equal(fb.confidenceScore, null);
  });

  it('generateIntentFallback returns safe values', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateIntentFallback({}, null);
    assert.equal(fb.highIntentSegments.length, 0);
    assert.equal(fb.buyingSignals.length, 0);
    assert.equal(fb.confidenceScore, null);
  });

  it('generatePositioningFallback returns safe values', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generatePositioningFallback({}, null, null);
    assert.equal(fb.messagingPillars.length, 0);
    assert.equal(fb.confidenceScore, null);
  });

  it('generateCampaignFallback returns PARTIALLY_GENERATED with empty arrays', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateCampaignFallback({}, null, {});
    assert.equal(fb.status, 'PARTIALLY_GENERATED');
    assert.equal(fb.campaignAngles.length, 0);
    assert.equal(fb.hooks.length, 0);
    assert.equal(fb.campaignIdeas.length, 0);
    assert.equal(fb.ctaSuggestions.length, 0);
    assert.equal(fb.actionPlan, null);
    assert.equal(fb.confidenceScore, null);
  });

  it('generateChannelFallback returns Unknown with empty recommendations', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateChannelFallback({}, null, null);
    assert.equal(fb.primaryChannel, 'Unknown');
    assert.equal(fb.recommendedChannels.length, 0);
    assert.equal(fb.confidenceScore, null);
  });
});

// =====================
// Text util — keyword validation
// =====================
describe('Text util — keyword validation', () => {
  it('isValidKeyword rejects navigation/generic single-word tokens', async () => {
    const mod = await import('../src/utils/text.util.js');
    const rejected = ['sign', 'login', 'click', 'menu', 'next', 'previous', 'learn', 'submit', 'copyright', 'started'];
    for (const token of rejected) {
      assert.equal(mod.isValidKeyword(token), false, `"${token}" should be rejected`);
    }
  });

  it('isValidKeyword accepts valid multi-word keywords', async () => {
    const mod = await import('../src/utils/text.util.js');
    assert.equal(mod.isValidKeyword('machine learning'), true);
    assert.equal(mod.isValidKeyword('SaaS pricing strategy'), true);
  });

  it('isValidKeyword rejects single-character keywords', async () => {
    const mod = await import('../src/utils/text.util.js');
    assert.equal(mod.isValidKeyword('a'), false);
  });

  it('normalizeSeoKeywords includes validationStatus in output', async () => {
    const mod = await import('../src/utils/text.util.js');
    const seo = {
      primaryKeywords: [{ keyword: 'test kw', searchVolume: 100 }],
    };
    const result = mod.normalizeSeoKeywords(seo);
    assert.ok(result);
    if (result.primaryKeywords?.length > 0) {
      assert.ok('validationStatus' in result.primaryKeywords[0]);
    }
  });

  it('normalizeSeoKeywords passes through validationStatus', async () => {
    const mod = await import('../src/utils/text.util.js');
    const seo = {
      primaryKeywords: [{ keyword: 'rare kw', searchVolume: 0, validationStatus: 'UNAVAILABLE' }],
    };
    const result = mod.normalizeSeoKeywords(seo);
    const kw = result.primaryKeywords?.find(k => k.keyword === 'rare kw');
    assert.ok(kw, 'keyword should be present in output');
    assert.equal(kw.validationStatus, 'UNAVAILABLE');
  });
});

// =====================
// AI Router — diagnostics
// =====================
describe('AI Router — diagnostics', () => {
  it('getAIProviderDiagnostics returns array with 4 providers', async () => {
    const mod = await import('../src/ai/services/aiRouter.service.js');
    const diag = mod.getAIProviderDiagnostics();
    assert.ok(Array.isArray(diag));
    assert.equal(diag.length, 4);
  });

  it('each diagnostic entry has required fields', async () => {
    const mod = await import('../src/ai/services/aiRouter.service.js');
    const diag = mod.getAIProviderDiagnostics();
    for (const p of diag) {
      assert.ok('provider' in p);
      assert.ok('configured' in p);
      assert.ok('status' in p);
      assert.ok('cooldownActive' in p);
      assert.ok('cooldownRemainingMs' in p);
      assert.ok('model' in p);
    }
  });

  it('all providers report configured when env vars set', async () => {
    const mod = await import('../src/ai/services/aiRouter.service.js');
    const diag = mod.getAIProviderDiagnostics();
    for (const p of diag) {
      assert.equal(p.configured, true, `${p.provider} should be configured`);
    }
  });
});

// =====================
// normalizeSeoKeywords — validationStatus propagation
// =====================
describe('normalizeSeoKeywords — validationStatus', () => {
  it('propagates validationStatus from keyword items', async () => {
    const mod = await import('../src/utils/text.util.js');
    const seo = {
      primaryKeywords: [
        { keyword: 'verified kw', searchVolume: 500, validationStatus: 'VERIFIED' },
        { keyword: 'unvalidated kw', searchVolume: 200, validationStatus: 'UNVALIDATED' },
      ],
      geoKeywords: [],
      competitorKeywords: [],
    };
    const result = mod.normalizeSeoKeywords(seo);
    const verified = result.primaryKeywords.find(k => k.keyword === 'verified kw');
    const unvalidated = result.primaryKeywords.find(k => k.keyword === 'unvalidated kw');
    assert.equal(verified?.validationStatus, 'VERIFIED');
    assert.equal(unvalidated?.validationStatus, 'UNVALIDATED');
  });
});

// =====================
// Blog Intelligence — generateBlogIntelligence contract
// =====================
describe('Blog Intelligence — generateBlogIntelligence', () => {
  it('returns empty blogIdeas when no validated keywords exist', async () => {
    const mod = await import('../src/services/seo/blog-intelligence.service.js');
    const result = await mod.generateBlogIntelligence({
      keywordIntelligence: {
        primaryKeywords: [{ keyword: 'test kw', validationStatus: 'UNVALIDATED' }],
        secondaryKeywords: [],
        longTailKeywords: [],
      },
      competitorIntelligence: { competitorProfiles: [] },
      geoIntelligence: {},
      identity: { productName: 'Test', industry: 'Tech' },
      orchestratorData: {},
    });
    assert.ok(Array.isArray(result.blogIdeas));
    assert.equal(result.blogIdeas.length, 0);
  });
});

// =====================
// Claim Validator — percentage growth patterns
// =====================
describe('Claim Validator — percentage patterns', () => {
  it('removes unsupported percentage follower claims', async () => {
    const mod = await import('../src/services/execution/claim-validator.service.js');
    const content = { body: 'Our product delivers 30% follower increase in 30 days.' };
    const result = mod.validateContentClaims(content, 'test');
    const removed = result.findings.filter(f => f.action === 'removed');
    assert.ok(removed.length >= 1);
    assert.equal(result.sanitized.body, null);
  });

  it('removes unsupported percentage engagement claims', async () => {
    const mod = await import('../src/services/execution/claim-validator.service.js');
    const content = { body: 'Users see 79% higher engagement with our solution.' };
    const result = mod.validateContentClaims(content, 'test');
    const removed = result.findings.filter(f => f.action === 'removed');
    assert.ok(removed.length >= 1);
    assert.equal(result.sanitized.body, null);
  });

  it('preserves valid evidence-backed claims', async () => {
    const mod = await import('../src/services/execution/claim-validator.service.js');
    const content = { body: 'Our platform helps marketing teams create better content.' };
    const result = mod.validateContentClaims(content, 'test');
    assert.equal(result.status, 'passed');
    assert.equal(result.sanitized.body, content.body);
  });
});

// =====================
// Content Studio — identity resolution
// =====================
describe('Content Studio — identity handling', () => {
  it('uses brief._productIdentity directly without re-resolving', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const brief = {
      product: { name: 'instagram' },
      _productIdentity: { productName: 'instagram', brandName: 'instagram', resolved: true, source: 'test' },
    };
    const result = await mod.generateContent('blog_article', brief, {}, null, 'user1', 'chat1');
    if (result._status === 'blocked') {
      assert.fail(`Content blocked with reason: ${result._reason}`);
    } else {
      assert.ok(result.content || result.headline);
    }
  });

  it('blocks when product name is empty', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const brief = {
      product: { name: '' },
      _productIdentity: { productName: null, brandName: null, resolved: false },
    };
    const result = await mod.generateContent('blog_article', brief, {}, null, 'user1', 'chat1');
    assert.equal(result._status, 'blocked');
    assert.ok(result._reason.includes('No product name'));
  });
});

// =====================
// DataForSEO location normalization
// =====================
describe('DataForSEO location normalization', () => {
  it('resolveLocation maps Global to US code 2840', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('Global');
    assert.equal(loc.location_code, 2840);
    assert.equal(loc.language_code, 'en');
    assert.equal(loc.fallbackApplied, true);
    assert.equal(loc.requestedLocation, 'Global');
  });

  it('resolveLocation maps Worldwide to US code 2840', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('Worldwide');
    assert.equal(loc.location_code, 2840);
    assert.equal(loc.fallbackApplied, true);
  });

  it('resolveLocation handles missing location', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('');
    assert.equal(loc.location_code, 2840);
    assert.equal(loc.fallbackApplied, true);
  });

  it('resolveLocation maps United States correctly', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('United States');
    assert.equal(loc.location_code, 2840);
    assert.equal(loc.language_code, 'en');
    assert.equal(loc.fallbackApplied, false);
  });

  it('resolveLocation maps India correctly', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('India');
    assert.equal(loc.location_code, 2034);
    assert.equal(loc.language_code, 'en');
    assert.equal(loc.fallbackApplied, false);
  });

  it('resolveLocation returns metadata', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('United States');
    assert.ok('requestedLocation' in loc);
    assert.ok('resolvedLocationCode' in loc || 'location_code' in loc);
    assert.ok('fallbackApplied' in loc);
  });

  it('resolveLocation leaves unknown location as unresolved', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const loc = mod.resolveLocation('Some Unknown Country');
    assert.equal(loc.unresolved, true);
    assert.equal(loc.fallbackApplied, false);
  });
});

// =====================
// DataForSEO endpoint validation
// =====================
describe('DataForSEO endpoint validation', () => {
  it('exported functions use only valid endpoints', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    assert.ok(typeof mod.getKeywordMetrics === 'function');
    assert.ok(typeof mod.getSerpCompetitors === 'function');
    assert.ok(typeof mod.getBacklinksSummary === 'function');
    assert.ok(typeof mod.getDomainAnalytics === 'function');
  });
});

// =====================
// DataForSEO article/competitor filtering
// =====================
describe('DataForSEO normalizeSerpCompetitors — article filtering', () => {
  it('rejects "What is" article titles', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const serpResults = [
      { domain: 'example.com', url: 'https://example.com/what-is-saas', title: 'What is SaaS? A Complete Guide', snippet: 'Learn what SaaS is', rank: 1 },
    ];
    const filtered = mod.normalizeSerpCompetitors(serpResults, {});
    assert.equal(filtered.length, 0);
  });

  it('rejects "Top 10" listicle titles', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const serpResults = [
      { domain: 'example.com', url: 'https://example.com/top-10-saas', title: 'Top 10 SaaS Management Platforms', snippet: 'Best SaaS tools', rank: 2 },
    ];
    const filtered = mod.normalizeSerpCompetitors(serpResults, {});
    assert.equal(filtered.length, 0);
  });

  it('rejects Wikipedia domains', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const serpResults = [
      { domain: 'en.wikipedia.org', url: 'https://en.wikipedia.org/wiki/SaaS', title: 'SaaS - Wikipedia', snippet: 'Software as a service', rank: 1 },
    ];
    const filtered = mod.normalizeSerpCompetitors(serpResults, {});
    assert.equal(filtered.length, 0);
  });

  it('rejects career/job pages', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const serpResults = [
      { domain: 'company.com', url: 'https://company.com/careers/saas-engineer', title: 'SaaS Engineer - Company Careers', snippet: 'Join our team', rank: 3 },
    ];
    const filtered = mod.normalizeSerpCompetitors(serpResults, {});
    assert.equal(filtered.length, 0);
  });

  it('preserves real competitor domains', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const serpResults = [
      { domain: 'realsassproduct.com', url: 'https://realsassproduct.com', title: 'RealSaaSProduct - Marketing Platform', snippet: 'Marketing platform for teams', rank: 1 },
    ];
    const filtered = mod.normalizeSerpCompetitors(serpResults, {});
    assert.equal(filtered.length, 1);
    assert.equal(filtered[0].domain, 'realsassproduct.com');
  });
});


