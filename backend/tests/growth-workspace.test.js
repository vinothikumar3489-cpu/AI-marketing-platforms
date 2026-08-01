import { describe, it, before } from 'node:test';
import assert from 'node:assert/strict';

const ORIGINAL_ENV = { ...process.env };

before(() => {
  process.env.DATAFORSEO_LOGIN = 'test-login';
  process.env.DATAFORSEO_PASSWORD = 'test-pass';
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
});

// =====================
// Fallback generators — evidence-grounded, never fabricated
// =====================
describe('Fallback generators — evidence discipline', () => {
  it('product fallback derives features from real website data only', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateProductFallback(
      { query: 'project management software', productName: 'TestPM' },
      {
        metadata: { title: 'TestPM - Project Management', description: 'Plan, track, and ship projects' },
        content: { headings: [{ text: 'Task Board' }, { text: 'Gantt Charts' }, { text: 'Menu' }] },
      },
      null
    );
    assert.ok(fb.productSummary.length > 0);
    assert.ok(fb.keyFeatures.some(f => f.value === 'Task Board'));
    assert.ok(!fb.keyFeatures.some(f => f.value === 'Menu'), 'Navigation headings must not be treated as features');
    assert.ok(fb.confidenceScore === null || typeof fb.confidenceScore === 'number');
    assert.equal(fb._dataSource, 'HYPOTHESIS');
  });

  it('product fallback with no context returns empty derived arrays', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateProductFallback({ query: 'project management software' }, null, null);
    assert.deepEqual(fb.jobsToBeDone, []);
    assert.deepEqual(fb.keyDifferentiators, []);
    assert.equal(fb.usp, null);
    assert.ok(fb.productSummary.length > 0);
  });

  it('market fallback never fabricates TAM/SAM/SOM without evidence', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateMarketFallback({ query: 'project management software' }, null, null);
    assert.notEqual(fb.tam, 'Unknown');
    assert.equal(fb.tam, null);
    assert.equal(fb.sam, null);
    assert.equal(fb.som, null);
    assert.deepEqual(fb.growthSignals, []);
  });

  it('market fallback surfaces real keyword-volume evidence when supplied', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateMarketFallback(
      { query: 'project management' },
      null,
      { keywords: [{ keyword: 'task management', searchVolume: 12000 }, { keyword: 'gantt chart', searchVolume: 3000 }] }
    );
    assert.ok(fb.growthSignals.some(s => s.source === 'DataForSEO keyword data'));
    assert.ok(fb.opportunities.length >= 1);
  });

  it('competitor fallback returns empty arrays when no verified competitors', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateCompetitorFallback({ query: 'x' }, null, []);
    assert.deepEqual(fb.competitors, []);
    assert.deepEqual(fb.directCompetitors, []);
    assert.equal(fb._dataSource, 'HYPOTHESIS');
  });

  it('competitor fallback preserves real orchestrator competitors', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateCompetitorFallback(
      { query: 'x' },
      null,
      [{ name: 'RealRival', domain: 'realrival.com', strengths: ['Speed'], weaknesses: ['Price'] }]
    );
    assert.equal(fb.directCompetitors.length, 1);
    assert.equal(fb.directCompetitors[0].domain, 'realrival.com');
    assert.equal(fb._dataSource, 'EVIDENCE_BASED');
  });

  it('campaign fallback returns GENERATED status and honest empty angles without evidence', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateCampaignFallback({ query: 'project management software' }, null, {});
    assert.ok(['GENERATED', 'PARTIALLY_GENERATED'].includes(fb.status));
    assert.ok(Array.isArray(fb.creativeAngles));
    assert.ok(Array.isArray(fb.copyHooks));
  });

  it('channel fallback derives primary channel from verified audience channels', async () => {
    const mod = await import('../src/modules/growth-workspace/fallback.generators.js');
    const fb = mod.generateChannelFallback(
      { query: 'x' },
      { bestChannels: [{ value: 'LinkedIn', fit: 'B2B audience' }, { value: 'SEO', fit: 'Long-term demand' }] },
      null,
      null
    );
    assert.equal(fb.primaryChannel, 'LinkedIn');
    assert.equal(fb.recommendedChannels.length, 2);
  });
});

// =====================
// Executive story — evidence context enrichment
// =====================
describe('Executive story — growth context', () => {
  const baseIntel = {
    companyIntelligence: { name: 'TestCo', industry: 'SaaS' },
    technologyIntelligence: { technologies: [{ name: 'Next.js', category: 'framework' }] },
    pricingIntelligence: { tiers: [{ name: 'Free', price: 0 }], hasFree: true },
    competitorIntelligence: { direct: [{ name: 'RivalA' }, { name: 'RivalB' }] },
    marketIntelligence: { tam: 'Unknown', sam: 'Unknown', som: 'Unknown' },
    audienceIntelligence: { personas: [{ name: 'Ops Lead' }] },
    evidence: { sources: [{ type: 'website_scrape' }, { type: 'technology_detection' }, { type: 'pricing_discovery' }], warnings: [] }
  };

  it('weaves growthSummary scores and evidence into the story', async () => {
    const mod = await import('../src/services/intelligence/executive-story.service.js');
    const story = mod.generateExecutiveStory(baseIntel, {
      growthSummary: {
        overallGrowthScore: 74,
        confidenceScore: 60,
        evidenceBasedCount: 8,
        hypothesisCount: 4,
        topRecommendation: 'Prioritize the verified task management demand signal.',
        primaryRisk: 'Competitive pressure from RivalA.',
        immediateAction: 'Test and optimize existing website CTAs.'
      },
      evidenceGrowthData: {
        companyOverview: { hasBlog: true },
        productIntelligence: { features: [{ value: 'Task Board' }] },
        technicalSeo: { performanceScore: 82 },
        growthSignals: [{ signal: 'Strong demand for task management tools', confidence: 70 }]
      },
      researchData: {
        keywords: [{ keyword: 'task management', searchVolume: 12000 }]
      }
    });
    assert.equal(story.executiveSummary.growthScore, 74);
    assert.equal(story.executiveSummary.evidenceBasedCount, 8);
    assert.ok(story.swot.strengths.some(s => s.value.includes('PageSpeed performance of 82')));
    assert.ok(story.swot.opportunities.some(o => o.value.includes('12,000') || o.value.includes('verified keywords')));
    assert.ok(story.swot.threats.some(t => t.value.includes('RivalA')));
    assert.equal(story.topPriorities[0].action, 'Prioritize the verified task management demand signal.');
    assert.ok(story.keyFindings.some(f => f.finding.includes('74/100')));
    assert.ok(story.executiveRecommendation.nextSteps[0].includes('demand signal'));
  });

  it('stays backward compatible without context', async () => {
    const mod = await import('../src/services/intelligence/executive-story.service.js');
    const story = mod.generateExecutiveStory(baseIntel);
    assert.equal(story.executiveSummary.growthScore, undefined);
    assert.ok(story.swot.strengths.length >= 1);
    assert.ok(story.topPriorities.length >= 3);
    assert.ok(story.keyFindings.length >= 3);
  });
});
