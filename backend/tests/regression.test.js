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
    assert.ok('authenticated' in status);
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


