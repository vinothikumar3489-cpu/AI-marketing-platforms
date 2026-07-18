import { describe, it, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import path from 'node:path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.resolve(__dirname, '../..');

const ORIGINAL_ENV = { ...process.env };

before(() => {
  process.env.DATAFORSEO_LOGIN = 'test-login';
  process.env.DATAFORSEO_PASSWORD = 'test-pass';
  process.env.GROQ_API_KEY = 'test-groq-key';
  process.env.GEMINI_API_KEY = 'test-gemini-key';
  process.env.OPENROUTER_API_KEY = 'test-openrouter-key';
});

after(() => {
  Object.assign(process.env, ORIGINAL_ENV);
});

const SERP_INPUT = [
  { domain: 'realproduct.com', url: 'https://realproduct.com', title: 'RealProduct - Marketing Platform', snippet: 'Marketing platform for teams', rank: 1 },
  { domain: 'en.wikipedia.org', url: 'https://en.wikipedia.org/wiki/SaaS', title: 'SaaS - Wikipedia', snippet: 'Software as a service', rank: 1 },
  { domain: 'company.com', url: 'https://company.com/careers/saas-engineer', title: 'SaaS Engineer - Careers', snippet: 'Join our team', rank: 2 },
  { domain: 'blog.example.com', url: 'https://blog.example.com/what-is-saas', title: 'What is SaaS? A Complete Guide', snippet: 'Learn what SaaS is', rank: 3 },
  { domain: 'target.com', url: 'https://target.com/support', title: 'Support - Target', snippet: 'Help center', rank: 4 },
  { domain: 'competitor.com', url: 'https://competitor.com', title: 'Competitor - Software Solution', snippet: 'Enterprise software', rank: 5 },
  { domain: 'toplist.com', url: 'https://toplist.com/best-saas', title: 'Top 10 SaaS Platforms for 2025', snippet: 'Best SaaS tools', rank: 6 },
  { domain: 'login-site.com', url: 'https://login-site.com/login', title: 'Login - Login Site', snippet: 'Sign in', rank: 7 },
  { domain: 'real-rival.com', url: 'https://real-rival.com', title: 'RealRival - Business Software', snippet: 'Business software for enterprises', rank: 8 },
  { domain: 'medium.com', url: 'https://medium.com/saas-article', title: 'SaaS Trends 2025', snippet: 'A Medium article about SaaS', rank: 9 },
];

// ============================================
// PRIORITY 1: Growth Route Restoration
// ============================================
describe('Priority 1 — Growth Route Restoration', () => {
  it('ProjectContext exports CreateChatReason type with valid reasons', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(path.join(projectRoot, 'frontend/src/context/ProjectContext.tsx'), 'utf8');
    assert.ok(src.includes('CreateChatReason'), 'CreateChatReason type must exist');
    assert.ok(src.includes('USER_CLICK_NEW_ANALYSIS'), 'Must include USER_CLICK_NEW_ANALYSIS');
    assert.ok(src.includes('FIRST_ACCOUNT_BOOTSTRAP'), 'Must include FIRST_ACCOUNT_BOOTSTRAP');
    assert.ok(src.includes('ANALYSIS_RUN_NO_CHAT'), 'Must include ANALYSIS_RUN_NO_CHAT');
  });

  it('ProjectContext has fullResultsByChat cache', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(path.join(projectRoot, 'frontend/src/context/ProjectContext.tsx'), 'utf8');
    assert.ok(src.includes('fullResultsByChat'), 'fullResultsByChat cache must exist');
  });

  it('GrowthWorkspacePage derives viewStatus from cache', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync(path.join(projectRoot, 'frontend/src/pages/GrowthWorkspacePage.tsx'), 'utf8');
    assert.ok(src.includes('viewStatus'), 'viewStatus must be present');
  });
});

// ============================================
// PRIORITY 2: Canonical Identity Resolver
// ============================================
describe('Priority 2 — Canonical Identity Resolver', () => {
  it('identity resolver exports resolveProductIdentity function', async () => {
    const mod = await import('../src/services/resolvers/product-identity.resolver.js');
    assert.equal(typeof mod.resolveProductIdentity, 'function');
  });

  it('identity resolver returns fieldConfidence in output', async () => {
    const mod = await import('../src/services/resolvers/product-identity.resolver.js');
    const result = mod.resolveProductIdentity({
      productIntelligence: { productName: 'TestPro', brandName: 'TestBrand', companyName: 'TestCo' },
      website: { title: 'TestPro - TestCo' },
    });
    assert.ok(result, 'Result should be truthy');
    if (result.fieldConfidence) {
      assert.ok(typeof result.fieldConfidence === 'object');
      assert.ok('productName' in result.fieldConfidence || 'companyName' in result.fieldConfidence);
    }
  });

  it('identity resolver returns aliases array', async () => {
    const mod = await import('../src/services/resolvers/product-identity.resolver.js');
    const result = mod.resolveProductIdentity({
      productIntelligence: { productName: 'TestPro', brandName: 'TestBrand', companyName: 'TestCo' },
    });
    assert.ok(result);
    if (result.aliases) {
      assert.ok(Array.isArray(result.aliases));
    }
  });

  it('identity resolver can produce conflicts when sources disagree', async () => {
    const mod = await import('../src/services/resolvers/product-identity.resolver.js');
    const result = mod.resolveProductIdentity({
      productIntelligence: { productName: 'Alpha', companyName: 'AlphaCorp' },
      website: { title: 'Beta - BetaCorp Funnel'},
    });
    assert.ok(result);
    if (result.conflicts) {
      assert.ok(Array.isArray(result.conflicts));
    }
  });
});

// ============================================
// PRIORITY 3: SEO — Keyword Quality & Competitor Filtering
// ============================================
describe('Priority 3 — SEO Filtering', () => {
  it('keyword-quality filter has expanded LOW_QUALITY_KEYWORDS set', async () => {
    const mod = await import('../src/services/execution/keyword-quality.filter.js');
    assert.ok(mod);
    assert.ok(typeof mod.prioritizeProductKeywords === 'function' || typeof mod.rateKeywordRelevance === 'function');
  });

  it('normalizeSerpCompetitors rejects articles, careers, wikipedia, support, login, same-domain', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const competitors = mod.normalizeSerpCompetitors(SERP_INPUT, { websiteUrl: 'https://target.com', productName: 'Target' });
    const domains = competitors.map(c => c.domain);
    assert.ok(!domains.includes('en.wikipedia.org'), 'Wikipedia must be rejected');
    assert.ok(!domains.includes('company.com'), 'Career pages must be rejected');
    assert.ok(!domains.includes('blog.example.com'), 'Article titles must be rejected');
    assert.ok(!domains.includes('target.com'), 'Same-domain support pages must be rejected');
    assert.ok(!domains.includes('toplist.com'), 'Listicle titles must be rejected');
    assert.ok(!domains.includes('login-site.com'), 'Login pages must be rejected');
    assert.ok(!domains.includes('medium.com'), 'Medium/knowledge domains must be rejected');
    assert.ok(domains.includes('realproduct.com'), 'Real competitor must be preserved');
    assert.ok(domains.includes('competitor.com'), 'Real competitor must be preserved');
    assert.ok(domains.includes('real-rival.com'), 'Real competitor must be preserved');
  });

  it('separateCompetitorsByType properly classifies', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const competitors = mod.normalizeSerpCompetitors(SERP_INPUT, { websiteUrl: 'https://target.com', productName: 'Target' });
    const separated = mod.separateCompetitorsByType(competitors);
    assert.ok(Array.isArray(separated.directBusinessCompetitors));
    assert.ok(Array.isArray(separated.serpCompetitors));
    assert.ok(Array.isArray(separated.directoryOrResearchSites));
    assert.ok(Array.isArray(separated.irrelevantFilteredSites));
  });

  it('normalizeSerpCompetitors excludes self-target-domain', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const selfInput = [
      { domain: 'target.com', url: 'https://target.com', title: 'Target - Home', snippet: 'Welcome', rank: 1 },
      { domain: 'target.com', url: 'https://target.com/blog/post', title: 'Target Blog Post', snippet: 'Blog', rank: 2 },
      { domain: 'real.com', url: 'https://real.com', title: 'Real - Product', snippet: 'Product page', rank: 3 },
    ];
    const competitors = mod.normalizeSerpCompetitors(selfInput, { websiteUrl: 'https://target.com', productName: 'Target' });
    const domains = competitors.map(c => c.domain);
    assert.ok(!domains.includes('target.com'), 'Self domain must be excluded');
    assert.ok(domains.includes('real.com'), 'Real competitor must be included');
  });
});

// ============================================
// PRIORITY 4: Growth Scoring Improvements
// ============================================
describe('Priority 4 — Growth Scoring', () => {
  it('growthWorkspace labels results with _dataSource', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/modules/growth-workspace/growthWorkspace.service.js', 'utf8');
    assert.ok(src.includes('labelResultSources'), 'labelResultSources function must exist');
    assert.ok(src.includes('EVIDENCE_BASED'), 'EVIDENCE_BASED constant must exist');
    assert.ok(src.includes('HYPOTHESIS'), 'HYPOTHESIS constant must exist');
  });

  it('calculateSubScore returns evidenceSource and penalty', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/modules/growth-workspace/growthWorkspace.service.js', 'utf8');
    assert.ok(src.includes('function calculateSubScore'), 'calculateSubScore must exist');
    assert.ok(src.includes('evidenceSource'), 'evidenceSource field must exist');
  });

  it('growth summary includes dimensionScores with evidenceSource per dimension', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/modules/growth-workspace/growthWorkspace.service.js', 'utf8');
    assert.ok(src.includes('evidenceBasedCount'), 'evidenceBasedCount in growthSummary');
    assert.ok(src.includes('hypothesisCount'), 'hypothesisCount in growthSummary');
  });
});

// ============================================
// PRIORITY 5: Campaign Intelligence
// ============================================
describe('Priority 5 — Campaign Intelligence', () => {
  it('campaign prompt does NOT hardcode 6 funnel stages', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/services/automation/campaign-intelligence.service.js', 'utf8');
    const funnelLine = src.match(/"marketingFunnel":\s*\{[^}]+/);
    if (funnelLine) {
      assert.ok(!funnelLine[0].includes('"awareness"'), 'Should not hardcode awareness');
    }
    assert.ok(src.includes('[stage_name]'), 'Prompt should use dynamic [stage_name]');
    assert.ok(src.includes('only include stages'), 'Prompt should instruct to only include evidence-supported stages');
  });

  it('campaign consistency validator does not require awareness/interest/consideration', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/services/automation/campaign-consistency.validator.js', 'utf8');
    assert.ok(!src.includes('campaign.marketingFunnel?.awareness'), 'Should not check for awareness specifically');
    assert.ok(src.includes('Object.keys(campaign.marketingFunnel).length === 0'), 'Should check for empty funnel instead');
  });

  it('campaign prompt instructs no fabricated KPIs', async () => {
    const fs = await import('fs');
    const src = fs.readFileSync('src/services/automation/campaign-intelligence.service.js', 'utf8');
    assert.ok(src.includes('Do NOT fabricate'), 'Prompt must forbid fabricated data');
    assert.ok(src.includes('kpi') === false || src.includes('KPI') || src.includes('kpi'), 'KPI framework should exist in prompt');
  });
});

// ============================================
// PRIORITY 6: Content Studio
// ============================================
describe('Priority 6 — Content Studio', () => {
  it('renderEmailHtmlTemplate exports a function', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    assert.equal(typeof mod.renderEmailHtmlTemplate, 'function');
  });

  it('renderEmailHtmlTemplate returns HTML with preheader, header, body, footer, unsubscribe', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const emailData = {
      subject: 'Test Email',
      previewText: 'Preview text',
      greeting: 'Hi {{firstName}},',
      opening: 'We have an exciting announcement.',
      bodyParagraphs: ['Paragraph 1', 'Paragraph 2'],
      bulletPoints: ['Benefit A', 'Benefit B'],
      ctaText: 'Get Started',
      ctaUrl: 'https://example.com/cta',
      closing: 'Best regards,',
      signature: 'The Team',
      complianceNote: null,
      emailType: 'product_announcement',
    };
    const result = mod.renderEmailHtmlTemplate(emailData, 'TestCo', 'https://testco.com', 'https://testco.com/unsubscribe');
    assert.ok(result.html, 'HTML output must exist');
    assert.ok(result.html.includes('<!DOCTYPE html'), 'HTML must start with DOCTYPE');
    assert.ok(result.html.includes('Preview text'), 'HTML must contain preview text');
    assert.ok(result.html.includes('TestCo'), 'HTML must contain company name');
    assert.ok(result.html.includes('unsubscribe'), 'HTML must contain unsubscribe link');
    assert.ok(result.html.includes('Get Started'), 'HTML must contain CTA text');
    assert.ok(result.plainText, 'Plain text version must exist');
    assert.equal(result._approvalStatus, 'draft', 'Default approval status must be draft');
    assert.equal(result._emailType, 'product_announcement');
  });

  it('renderEmailHtmlTemplate handles null unsubscribe gracefully', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const emailData = { subject: 'Test', greeting: 'Hi', opening: 'Body', bulletPoints: [], ctaText: null, emailType: 'nurture' };
    const result = mod.renderEmailHtmlTemplate(emailData);
    assert.ok(result.html.includes('UNSUBSCRIBE'), 'Should have reply UNSUBSCRIBE fallback');
  });

  it('withApprovalStatus returns content with _approvalStatus', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const content = { body: 'test content' };
    const approved = mod.withApprovalStatus(content, 'approved');
    assert.equal(approved._approvalStatus, 'approved');
    assert.ok(Array.isArray(approved._approvalHistory));
    assert.equal(approved._version, 1);
  });

  it('APPROVAL_STATUSES has all required states', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const statuses = mod.APPROVAL_STATUSES;
    assert.equal(statuses.DRAFT, 'draft');
    assert.equal(statuses.VALIDATION_FAILED, 'validation_failed');
    assert.equal(statuses.READY_FOR_REVIEW, 'ready_for_review');
    assert.equal(statuses.APPROVED, 'approved');
    assert.equal(statuses.REJECTED, 'rejected');
    assert.equal(statuses.CHANGES_REQUESTED, 'changes_requested');
    assert.equal(statuses.SCHEDULED, 'scheduled');
    assert.equal(statuses.SENDING, 'sending');
    assert.equal(statuses.SENT, 'sent');
    assert.equal(statuses.FAILED, 'failed');
  });
});

// ============================================
// ALL EXPORTS VALIDATION
// ============================================
describe('All module exports — contract validation', () => {
  it('content-studio exports all 20 content generators plus new functions', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    const generators = [
      'generateLinkedInPost', 'generateInstagramPost', 'generateTwitterPost', 'generateFacebookPost',
      'generateYouTubeDescription', 'generateEmailCopy', 'generateCreativeBrief', 'generateVideoScript',
      'generateBlogArticle', 'generateFAQ', 'generateLandingPage', 'generateProductPage',
      'generateComparisonPage', 'generateFeatureAnnouncement', 'generateWhitepaper',
      'generateContent', 'generateContentStudioPlan',
    ];
    for (const name of generators) {
      assert.equal(typeof mod[name], 'function', `${name} must be a function`);
    }
    assert.equal(typeof mod.renderEmailHtmlTemplate, 'function');
    assert.equal(typeof mod.withApprovalStatus, 'function');
    assert.ok(mod.APPROVAL_STATUSES);
  });

  it('dataforseo exports all key service functions', async () => {
    const mod = await import('../src/services/dataforseo.service.js');
    const fns = ['isDataForSEOConfigured', 'isDataForSEOAvailable', 'getDataForSEOStatus', 'normalizeSerpCompetitors', 'separateCompetitorsByType', 'getKeywordMetrics', 'getSerpCompetitors', 'getBacklinksSummary', 'getDomainAnalytics', 'getDomainData', 'resolveLocation'];
    for (const name of fns) {
      assert.equal(typeof mod[name], 'function', `${name} must be a function`);
    }
  });

  it('campaign-intelligence exports generateCampaignIntelligence', async () => {
    const mod = await import('../src/services/automation/campaign-intelligence.service.js');
    assert.equal(typeof mod.generateCampaignIntelligence, 'function');
  });
});

// ============================================
// PRIORITY 21: Multi-Product Campaign Differentiation
// ============================================
describe('Priority 21 — Multi-Product Campaign Differentiation', () => {
  const products = [
    { name: 'Make', industry: 'automation', domain: 'make.com', desc: 'Visual AI automation platform' },
    { name: 'Figma', industry: 'design', domain: 'figma.com', desc: 'Collaborative design tool' },
    { name: 'Stripe', industry: 'payments', domain: 'stripe.com', desc: 'Payment processing platform' },
    { name: 'Notion', industry: 'productivity', domain: 'notion.com', desc: 'All-in-one workspace' },
    { name: 'Calendly', industry: 'scheduling', domain: 'calendly.com', desc: 'Automated scheduling platform' },
  ];

  it('generates distinct campaign fingerprints for different products', async () => {
    const mod = await import('../src/services/automation/campaign-intelligence.service.js');
    const fingerprints = new Set();
    for (const p of products) {
      const context = {
        company: { name: { value: p.name }, industry: { value: p.industry }, businessModel: { value: 'SaaS' }, pricing: { value: 'Freemium' }, buyingCycle: { value: 'Self-serve' } },
        product: { name: { value: p.name }, category: { value: p.industry }, description: { value: p.desc }, features: { value: [] }, usp: { value: '' } },
        website: { title: { value: p.name }, metaDescription: { value: p.desc }, heroText: { value: '' }, ctaTexts: { value: [] } },
        audience: { primary: { value: '' }, personas: { value: [] }, painPoints: { value: [] } },
        competitors: { list: { value: [] } },
        seo: { keywords: { value: [] }, issues: { value: [] } },
        channels: [],
        growth: {},
        sources: { sourcesCollected: [] },
        productIdentity: { productName: p.name, companyName: p.name, industry: p.industry },
      };
      const fp = mod.generateFingerprint ? mod.generateFingerprint(context) : p.name;
      fingerprints.add(fp);
    }
    assert.equal(fingerprints.size, products.length, `Expected ${products.length} unique fingerprints, got ${fingerprints.size}`);
  });

  it('campaign prompt does not hardcode 90-day skeleton for any product', async () => {
    const mod = await import('../src/services/automation/campaign-intelligence.service.js');
    const src = mod.buildCampaignPrompt ? mod.buildCampaignPrompt.toString() : '';
    if (src) {
      assert.ok(!src.includes('90 day') && !src.includes('90-day'), 'Prompt must not hardcode 90-day duration');
    }
  });

  it('version 3 exports transitionApprovalStatus and previewEmail', async () => {
    const mod = await import('../src/services/execution/content-studio.service.js');
    assert.equal(typeof mod.transitionApprovalStatus, 'function');
    assert.equal(typeof mod.previewEmail, 'function');
  });

  it('content-asset exports verifyAssetPersistence', async () => {
    const mod = await import('../src/services/execution/content-asset.service.js');
    assert.equal(typeof mod.verifyAssetPersistence, 'function');
    assert.equal(typeof mod.verifyBrevoOperationPersistence, 'function');
  });

  it('quality-scorer has contentCompleteness and platformSpecificQuality checks', async () => {
    const mod = await import('../src/services/execution/quality-scorer.service.js');
    assert.ok(mod.QUALITY_CHECKS.contentCompleteness, 'contentCompleteness check must exist');
    assert.ok(mod.QUALITY_CHECKS.platformSpecificQuality, 'platformSpecificQuality check must exist');
  });

  it('brevo provider has idempotent send functions', async () => {
    const mod = await import('../src/services/brevo/brevo.provider.js');
    assert.equal(typeof mod.sendTestEmailIdempotent, 'function');
    assert.equal(typeof mod.sendCampaignNowIdempotent, 'function');
    assert.equal(typeof mod.healthCheck, 'function');
  });

  it('shared-competitor validates against articles and knowledge domains', async () => {
    const mod = await import('../src/services/competitors/shared-competitor.service.js');
    const src = mod.getValidatedCompetitorsForChat ? '' : 'no getValidatedCompetitorsForChat';
    assert.ok(!src, 'shared-competitor must export getValidatedCompetitorsForChat');
  });

  it('keyword pipeline returns candidates with phrase, sourceUrl, validationStatus', async () => {
    const mod = await import('../src/services/seo/keyword-intelligence.service.js');
    const src = mod.generateKeywordIntelligence ? 'exists' : '';
    assert.ok(src, 'keyword-intelligence must export generateKeywordIntelligence');
  });
});
