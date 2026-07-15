
import { classifyKeyword } from './seo-frontend-payload.service.js';

const ACTION_PRIORITY = { CRITICAL: 'CRITICAL', HIGH: 'HIGH', MEDIUM: 'MEDIUM', LOW: 'LOW' };
const ACTION_EFFORT = { LOW: 'LOW', MEDIUM: 'MEDIUM', HIGH: 'HIGH' };
const ACTION_STATUS = { NOT_STARTED: 'NOT_STARTED', IN_PROGRESS: 'IN_PROGRESS', COMPLETED: 'COMPLETED', BLOCKED: 'BLOCKED', NOT_APPLICABLE: 'NOT_APPLICABLE' };

function createAction(title, opts = {}) {
  return {
    title,
    category: opts.category || 'Content',
    priority: opts.priority || 'MEDIUM',
    effort: opts.effort || 'MEDIUM',
    owner: opts.owner || 'Marketing',
    reason: opts.reason || null,
    evidence: opts.evidence || null,
    expectedOutcome: opts.expectedOutcome || null,
    status: 'NOT_STARTED',
    inferenceStatus: opts.inferenceStatus || 'AI_INFERRED',
    dependencies: opts.dependencies || []
  };
}

function generateTechnicalActions(technicalAudit, identity) {
  const actions = [];
  if (!technicalAudit) return actions;

  const mobile = technicalAudit.mobile || {};
  const desktop = technicalAudit.desktop || {};

  if (mobile.performance !== null && mobile.performance < 50) {
    actions.push(createAction('Improve mobile performance score', {
      category: 'Technical SEO',
      priority: 'CRITICAL',
      effort: 'HIGH',
      owner: 'Engineering',
      reason: `Mobile performance score is ${mobile.performance}/100, below the 50 threshold`,
      evidence: 'Google PageSpeed Insights',
      expectedOutcome: 'Mobile page load time reduced, user experience improved',
      inferenceStatus: 'MEASURED'
    }));
  }

  if (mobile.accessibility !== null && mobile.accessibility < 70) {
    actions.push(createAction('Fix mobile accessibility issues', {
      category: 'Technical SEO',
      priority: 'HIGH',
      effort: 'MEDIUM',
      owner: 'Engineering',
      reason: `Mobile accessibility score is ${mobile.accessibility}/100`,
      evidence: 'Google PageSpeed Insights',
      expectedOutcome: 'Improved accessibility compliance and broader audience reach',
      inferenceStatus: 'MEASURED'
    }));
  }

  if (desktop.performance !== null && desktop.performance < 50) {
    actions.push(createAction('Improve desktop performance', {
      category: 'Technical SEO',
      priority: 'HIGH',
      effort: 'MEDIUM',
      owner: 'Engineering',
      reason: `Desktop performance score is ${desktop.performance}/100`,
      evidence: 'Google PageSpeed Insights',
      expectedOutcome: 'Faster desktop load times and better user retention',
      inferenceStatus: 'MEASURED'
    }));
  }

  return actions;
}

function generateOnPageActions(keywords, identity) {
  const actions = [];
  const kwList = (keywords || []).slice(0, 5);

  if (kwList.length > 0) {
    const primaryKw = kwList.find(k => classifyKeyword(k.keyword, identity?.productName) !== 'BROAD') || kwList[0];
    if (primaryKw) {
      actions.push(createAction(`Create a dedicated ${primaryKw.keyword} landing page`, {
        category: 'On-Page SEO',
        priority: 'HIGH',
        effort: 'MEDIUM',
        reason: `Primary keyword "${primaryKw.keyword}" lacks a dedicated optimized page`,
        evidence: 'Keyword Intelligence + Product Intelligence',
        expectedOutcome: 'Improved topical clarity for key product-category queries'
      }));
    }
  }

  const productName = identity?.productName;
  if (productName) {
    actions.push(createAction(`Optimize page titles and meta descriptions for ${productName}`, {
      category: 'On-Page SEO',
      priority: 'HIGH',
      effort: 'LOW',
      reason: 'Page titles and meta descriptions should align with target keywords',
      evidence: 'Technical SEO Audit + On-Page Analysis',
      expectedOutcome: 'Improved click-through rates from search results'
    }));
  }

  return actions;
}

function generateContentActions(keywords, contentGaps, identity) {
  const actions = [];
  const gaps = (contentGaps || []).slice(0, 5);

  if (gaps.length > 0) {
    gaps.slice(0, 3).forEach(gap => {
      actions.push(createAction(gap.title || `Create ${gap.targetKeyword || 'targeted'} content`, {
        category: 'Content',
        priority: gap.priority || 'MEDIUM',
        effort: gap.effort || 'MEDIUM',
        reason: gap.reason || `Content gap identified: ${gap.title}`,
        evidence: gap.evidence || 'Content Gap Analysis',
        expectedOutcome: `Fill content gap for ${gap.targetKeyword || gap.title}`
      }));
    });
  }

  const productName = identity?.productName;
  if (productName) {
    actions.push(createAction(`Build comparison pages for ${productName} vs alternatives`, {
      category: 'Content',
      priority: 'MEDIUM',
      effort: 'MEDIUM',
      reason: 'Comparison pages capture commercial-intent traffic from users evaluating options',
      evidence: 'Competitor Intelligence + Content Gap Analysis',
      expectedOutcome: 'Capture bottom-of-funnel traffic with purchase intent'
    }));
  }

  return actions;
}

function generateStrategyActions(keywords, identity) {
  const actions = [];
  const productName = identity?.productName;

  if (productName) {
    actions.push(createAction(`Build topical authority cluster around ${productName}`, {
      category: 'Keyword Strategy',
      priority: 'HIGH',
      effort: 'HIGH',
      reason: 'Topical authority improves ranking for multiple related keywords',
      evidence: 'Keyword Intelligence + Content Gap Analysis',
      expectedOutcome: 'Improved domain authority for product-category terms',
      dependencies: ['Create dedicated product landing page']
    }));
  }

  const brandKws = (keywords || []).filter(k => classifyKeyword(k.keyword, productName) === 'BRAND');
  if (brandKws.length === 0 && productName) {
    actions.push(createAction(`Target branded + category keyword phrases for ${productName}`, {
      category: 'Keyword Strategy',
      priority: 'MEDIUM',
      effort: 'LOW',
      reason: 'Branded keywords with category context have higher conversion intent',
      evidence: 'Keyword opportunity identification',
      expectedOutcome: 'Improved visibility for product-category searches'
    }));
  }

  return actions;
}

function generateStructuredDataActions(technicalAudit) {
  const actions = [];
  actions.push(createAction('Implement FAQ structured data on relevant pages', {
    category: 'Structured Data',
    priority: 'MEDIUM',
    effort: 'LOW',
    reason: 'FAQ schema enables rich results and improves SERP visibility',
    evidence: 'Technical SEO Audit + Structured Data Best Practices',
    expectedOutcome: 'Rich results in search for FAQ content'
  }));

  actions.push(createAction('Add product/service schema to core pages', {
    category: 'Structured Data',
    priority: 'HIGH',
    effort: 'LOW',
    reason: 'Product schema helps search engines understand offerings and enables rich snippets',
    evidence: 'Technical SEO Audit',
    expectedOutcome: 'Enhanced SERP appearance with structured data'
  }));

  return actions;
}

function generateAiReadinessActions(aiSearchReadiness) {
  const actions = [];
  if (!aiSearchReadiness) return actions;

  if (aiSearchReadiness.structuredDataReadiness === 'LOW' || !aiSearchReadiness.structuredDataReadiness) {
    actions.push(createAction('Improve structured data coverage for AI search readiness', {
      category: 'AI Search Readiness',
      priority: 'MEDIUM',
      effort: 'MEDIUM',
      reason: 'Structured data helps AI platforms understand and cite content',
      evidence: 'AI Search Readiness Analysis',
      expectedOutcome: 'Better visibility in AI-generated search results'
    }));
  }

  if (aiSearchReadiness.entityClarity === 'LOW' || !aiSearchReadiness.entityClarity) {
    actions.push(createAction('Improve entity clarity and topical authority', {
      category: 'AI Search Readiness',
      priority: 'MEDIUM',
      effort: 'MEDIUM',
      reason: 'Clear entity definitions help AI platforms understand brand and product context',
      evidence: 'AI Search Readiness Analysis',
      expectedOutcome: 'Improved citation rates in AI-generated answers'
    }));
  }

  return actions;
}

function generateCompetitorActions(competitors, keywordGaps) {
  const actions = [];
  const verified = (competitors || []).filter(c => c.validationStatus === 'VERIFIED' || c.competitorType === 'DIRECT');

  if (verified.length > 0) {
    const topComp = verified[0];
    actions.push(createAction(`Conduct deep content analysis of ${topComp.name}`, {
      category: 'Competitor Research',
      priority: 'LOW',
      effort: 'MEDIUM',
      owner: 'Content Strategy',
      reason: `${topComp.name} is a validated competitor. Understanding their content strategy reveals gaps`,
      evidence: 'Competitor Intelligence',
      expectedOutcome: 'Identify content differentiation opportunities'
    }));
  }

  return actions;
}

function generateMeasurementActions() {
  return [
    createAction('Set up Google Search Console tracking for target keywords', {
      category: 'Measurement',
      priority: 'MEDIUM',
      effort: 'LOW',
      owner: 'Engineering',
      reason: 'GSC provides verified click and impression data for organic search performance',
      evidence: 'SEO Best Practices',
      expectedOutcome: 'Measure organic search performance for target keywords',
      inferenceStatus: 'HEURISTIC'
    }),
    createAction('Configure regular PageSpeed monitoring', {
      category: 'Measurement',
      priority: 'LOW',
      effort: 'LOW',
      owner: 'Engineering',
      reason: 'Regular performance monitoring catches regressions before they impact rankings',
      evidence: 'SEO Best Practices',
      expectedOutcome: 'Track and maintain page speed performance over time',
      inferenceStatus: 'HEURISTIC'
    })
  ];
}

export function generateSeoActionPlan({
  technicalAudit,
  keywords = [],
  contentGaps = [],
  competitors = [],
  keywordGaps = [],
  aiSearchReadiness,
  identity
}) {
  const actions = [
    ...generateTechnicalActions(technicalAudit, identity),
    ...generateOnPageActions(keywords, identity),
    ...generateContentActions(keywords, contentGaps, identity),
    ...generateStrategyActions(keywords, identity),
    ...generateStructuredDataActions(technicalAudit),
    ...generateAiReadinessActions(aiSearchReadiness),
    ...generateCompetitorActions(competitors, keywordGaps),
    ...generateMeasurementActions()
  ];

  const priorityOrder = { CRITICAL: 0, HIGH: 1, MEDIUM: 2, LOW: 3 };
  actions.sort((a, b) => (priorityOrder[a.priority] || 99) - (priorityOrder[b.priority] || 99));

  return {
    actions,
    totalActions: actions.length,
    byPriority: {
      critical: actions.filter(a => a.priority === 'CRITICAL').length,
      high: actions.filter(a => a.priority === 'HIGH').length,
      medium: actions.filter(a => a.priority === 'MEDIUM').length,
      low: actions.filter(a => a.priority === 'LOW').length
    },
    byCategory: Object.fromEntries(
      [...new Set(actions.map(a => a.category))].map(cat => [cat, actions.filter(a => a.category === cat).length])
    ),
    generatedAt: new Date().toISOString()
  };
}
