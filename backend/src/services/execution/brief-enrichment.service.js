import { getLatestEvidenceSnapshot } from '../../modules/evidence/evidence.service.js';
import { getSeoIntelligenceForChat } from "../loaders/seo-intelligence.loader.js";
import { getProductIntelligenceForChat } from "../loaders/product-intelligence.loader.js";
import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';
import { normalizeProductForContentStudio } from "../normalizers/product-intelligence.normalizer.js";
import { normalizeSeoForExecution } from "../normalizers/seo-intelligence.normalizer.js";
import { asArray, takeArray } from "../normalizers/array-helpers.js";

const MINIMUM_REQUIREMENTS = {
  features: { count: 5, label: 'Product Features' },
  benefits: { count: 5, label: 'Product Benefits' },
  painPoints: { count: 5, label: 'Pain Points' },
  useCases: { count: 3, label: 'Use Cases' },
  personas: { count: 3, label: 'Audience Personas' },
  keywords: { count: 10, label: 'SEO Keywords' },
  contentGaps: { count: 5, label: 'Content Gaps' },
  campaignGoal: { count: 1, label: 'Campaign Goal' },
  primaryCta: { count: 1, label: 'Primary CTA' },
};

function deriveFeaturesFromEvidence(evidence) {
  const derived = [];
  const raw = evidence?.evidence || {};
  const website = raw.website || {};
  const textSources = [
    website.title, website.metaDescription, website.heroText,
    ...(website.ctaTexts || []),
    ...(Array.isArray(website.featuresText) ? website.featuresText : []),
  ].filter(Boolean).join(' ').toLowerCase();

  if (!textSources) return derived;

  const patterns = [
    { name: 'Analytics & Reporting', keywords: ['analytics', 'reporting', 'dashboard', 'metrics', 'tracking', 'insights'] },
    { name: 'Automation', keywords: ['automation', 'automated', 'workflow', 'streamline'] },
    { name: 'AI & Machine Learning', keywords: ['ai', 'artificial intelligence', 'machine learning', 'smart', 'intelligent'] },
    { name: 'Integration', keywords: ['integration', 'connect', 'api', 'sync', 'embed', 'plugin'] },
    { name: 'Security & Compliance', keywords: ['security', 'secure', 'compliance', 'encrypt', 'privacy', 'gdpr'] },
    { name: 'Collaboration', keywords: ['collaboration', 'team', 'share', 'collaborate', 'coordinate'] },
    { name: 'Content Management', keywords: ['content', 'manage', 'create', 'publish', 'organize'] },
    { name: 'Search & Discovery', keywords: ['search', 'discovery', 'find', 'explore', 'navigate'] },
    { name: 'Personalization', keywords: ['personalization', 'personalize', 'customize', 'tailor', 'adaptive'] },
    { name: 'Real-time Processing', keywords: ['real-time', 'realtime', 'live', 'instant', 'immediate'] },
    { name: 'Scalability', keywords: ['scale', 'scalable', 'enterprise', 'grow'] },
    { name: 'Reporting', keywords: ['report', 'visualize', 'chart', 'graph'] },
    { name: 'Templates & Library', keywords: ['template', 'library', 'asset', 'repository'] },
    { name: 'Notifications & Alerts', keywords: ['notification', 'alert', 'notify', 'remind'] },
  ];

  patterns.forEach(({ name, keywords }) => {
    if (keywords.some(k => textSources.includes(k))) {
      derived.push({
        name,
        description: null,
        benefit: null,
        evidence: 'evidence_snapshot',
        inferenceStatus: 'AI_INFERRED',
      });
    }
  });

  return derived;
}

function deriveBenefitsFromFeatures(features) {
  return features
    .filter(f => f.benefit)
    .map(f => ({
      text: f.benefit,
      evidence: f.evidence || null,
      inferenceStatus: f.inferenceStatus || 'AI_INFERRED',
    }));
}

function deriveFeaturesFromSummary(summary) {
  if (!summary) return [];
  const words = summary.split(/\s+/).filter(w => w.length > 5).slice(0, 5);
  if (words.length < 2) return [];
  return [{
    name: words.join(' ') + ' capability',
    description: summary.substring(0, 200),
    benefit: null,
    evidence: null,
    inferenceStatus: 'AI_INFERRED',
  }];
}

function deriveBenefitsFromSummary(summary) {
  if (!summary) return [];
  return [{
    text: summary.length > 120 ? summary.substring(0, 120) + '...' : summary,
    evidence: null,
    inferenceStatus: 'AI_INFERRED',
  }];
}

function derivePainPointsFromCompetitors(competitors) {
  if (!competitors?.length) return [];
  const painPoints = [];
  competitors.forEach(c => {
    if (c.weaknesses?.length) {
      c.weaknesses.forEach(w => {
        if (typeof w === 'string' && w.length > 5) painPoints.push(w);
      });
    }
  });
  return takeArray(painPoints, 5);
}

function derivePainPointsFromSummary(summary) {
  if (!summary) return [];
  const painPointIndicators = [
    'challenge', 'problem', 'difficult', 'complex', 'pain', 'struggle',
    'inefficient', 'manual', 'slow', 'costly', 'frustrat', 'limitation',
    'lack', 'missing', 'gap', 'issue', 'bottleneck', 'obstacle',
  ];
  const summaryLower = summary.toLowerCase();
  const found = painPointIndicators.filter(p => summaryLower.includes(p));
  if (found.length === 0) return ['Inefficient manual processes', 'Lack of visibility into key metrics', 'Difficulty scaling operations', 'High operational costs', 'Fragmented tool ecosystem'].slice(0, 5);
  return found.map(p => `Overcoming "${p}" challenges in daily operations`).slice(0, 5);
}

function deriveUseCasesFromFeatures(features, summary) {
  if (!features?.length && !summary) return [];
  const useCases = [];
  const featureNames = features.map(f => typeof f === 'string' ? f : (f.name || '')).filter(Boolean);
  if (featureNames.length > 0) {
    useCases.push({ scenario: `Leveraging ${featureNames[0]} for daily operations`, solution: `${featureNames[0]} enables teams to automate and optimize workflows`, outcome: 'Increased efficiency and reduced manual effort' });
  }
  if (featureNames.length > 1) {
    useCases.push({ scenario: `Using ${featureNames[1]} for strategic decision-making`, solution: `${featureNames[1]} provides actionable insights for ${summary?.substring(0, 50) || 'business growth'}`, outcome: 'Data-driven decisions with measurable results' });
  }
  if (featureNames.length > 2) {
    useCases.push({ scenario: `Combining ${featureNames[0]} and ${featureNames[1]} for comprehensive solutions`, solution: `Integrated approach using both capabilities`, outcome: 'End-to-end workflow transformation' });
  }
  return useCases.slice(0, 3);
}

function extractSources(brief, campaignData, execDashboard) {
  const sources = [];
  if (brief.evidenceSources?.hasEvidenceSnapshot) sources.push('Evidence Snapshot');
  if (brief.evidenceSources?.hasProductIntel) sources.push('Product Intelligence');
  if (brief.evidenceSources?.hasCompetitorIntel) sources.push('Competitor Intelligence');
  if (brief.evidenceSources?.hasSeoIntel) sources.push('SEO Intelligence');
  if (campaignData) sources.push('Campaign Intelligence');
  if (execDashboard) sources.push('Executive Dashboard');
  if (brief._growthWs) sources.push('Growth Workspace');
  return sources;
}

export async function enrichContentBrief(prisma, userId, chatId, brief) {
  if (!brief || brief.rejected) return { brief, enriched: false, reason: 'Brief was rejected' };

  const diagnostics = { missing: [], enriched: [], warnings: [] };
  const enriched = JSON.parse(JSON.stringify(brief));

  const campaignIntel = await prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null);
  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId }).catch(() => null);
  const productIntel = await getProductIntelligenceForChat({ prisma, userId, chatId }).catch(() => null);
  const seoIntel = await getSeoIntelligenceForChat({ prisma, userId, chatId }).catch(() => null);

  let growthWs = null;
  try {
    if (prisma.growthWorkspace) {
      growthWs = await prisma.growthWorkspace.findFirst({ where: { chatId, userId } });
    }
  } catch { growthWs = null; }

  const campaignData = campaignIntel?.campaignGenerator || {};
  const channelData = campaignIntel?.channelRecommendation || {};
  const productAnalysis = productIntel?.productAnalysis || {};
  const audienceData = productIntel?.audienceIntelligence || {};
  const rawEvidence = evidenceSnapshot?.evidence || {};
  const website = rawEvidence.website || {};
  const execDashboard = seoIntel?.executiveDashboard || null;

  enriched._sources = extractSources(brief, campaignData, execDashboard);
  enriched._growthWs = growthWs;

  enriched.campaign = {
    goal: campaignData.campaignGoals?.[0] || campaignData.goals?.[0] || campaignData.objective || null,
    businessGoal: campaignData.businessGoal || campaignData.businessObjective || null,
    timeline: campaignData.timeline || campaignData.campaignTimeline || null,
    channels: channelData?.recommendedChannels?.map(ch => ({
      channel: ch.channel || ch.name,
      priority: ch.priority || 'medium',
      reason: ch.reason || null,
    })) || [],
    marketingFunnel: campaignData.funnelStage || campaignData.marketingFunnel || null,
    creativeAngles: takeArray(campaignData.creativeAngles || campaignData.messagingPillars, 5),
    brandVoice: campaignData.brandVoice || productAnalysis.brandVoice || null,
  };

  enriched.executive = {
    story: execDashboard?.executiveStory || execDashboard?.executiveSummary || null,
    recommendations: execDashboard?.executiveRecommendations || execDashboard?.actionPlan || null,
    overview: execDashboard?.executiveOverview || execDashboard?.summary || null,
  };

  const featuresFromNormalizer = normalizeProductForContentStudio(productIntel, {
    website,
    usp: productAnalysis.usp,
    summary: productAnalysis.summary || productAnalysis.productSummary,
  });

  let allFeatures = [...(featuresFromNormalizer.features || [])];
  let allBenefits = [...(featuresFromNormalizer.benefits || [])];
  let allPainPoints = [...(featuresFromNormalizer.painPoints || [])];
  let allUseCases = [...(featuresFromNormalizer.useCases || [])];

  if (allFeatures.length < MINIMUM_REQUIREMENTS.features.count) {
    const fromEvidence = deriveFeaturesFromEvidence(evidenceSnapshot);
    const fromSummary = deriveFeaturesFromSummary(productAnalysis.summary || productAnalysis.productSummary);
    const combined = [...allFeatures, ...fromEvidence, ...fromSummary];
    const seen = new Set();
    allFeatures = combined.filter(f => {
      const key = f.name?.toLowerCase() || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fromEvidence.length > 0) diagnostics.enriched.push(`Derived ${fromEvidence.length} features from Evidence Snapshot`);
    if (fromSummary.length > 0) diagnostics.enriched.push(`Derived ${fromSummary.length} features from product summary`);
  }

  if (allBenefits.length < MINIMUM_REQUIREMENTS.benefits.count) {
    const fromFeatures = deriveBenefitsFromFeatures(allFeatures);
    const fromSummary = deriveBenefitsFromSummary(productAnalysis.summary || productAnalysis.productSummary);
    const combined = [...allBenefits, ...fromFeatures, ...fromSummary];
    const seen = new Set();
    allBenefits = combined.filter(b => {
      const key = b.text?.toLowerCase() || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fromFeatures.length > 0) diagnostics.enriched.push(`Derived ${fromFeatures.length} benefits from feature benefits`);
    if (fromSummary.length > 0) diagnostics.enriched.push(`Derived ${fromSummary.length} benefits from product summary`);
  }

  if (allPainPoints.length < MINIMUM_REQUIREMENTS.painPoints.count) {
    const fromCompetitors = derivePainPointsFromCompetitors(enriched.validatedCompetitors);
    const fromSummary = derivePainPointsFromSummary(productAnalysis.summary || productAnalysis.productSummary);
    const combined = [...allPainPoints, ...fromCompetitors, ...fromSummary];
    const seen = new Set();
    allPainPoints = combined.filter(p => {
      const key = p.toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fromCompetitors.length > 0) diagnostics.enriched.push(`Derived ${fromCompetitors.length} pain points from competitor weaknesses`);
    if (fromSummary.length > 0) diagnostics.enriched.push(`Derived pain points from product summary`);
  }

  if (allUseCases.length < MINIMUM_REQUIREMENTS.useCases.count) {
    const derived = deriveUseCasesFromFeatures(allFeatures, productAnalysis.summary || productAnalysis.productSummary);
    allUseCases = [...allUseCases, ...derived];
    if (derived.length > 0) diagnostics.enriched.push(`Derived ${derived.length} use cases from features`);
  }

  enriched.product.features = takeArray(allFeatures, 15);
  enriched.product.benefits = takeArray(allBenefits, 10);
  enriched.painPoints = takeArray(allPainPoints, 10);
  enriched.product.useCases = takeArray(allUseCases, 5);

  if (!enriched.campaign.goal) {
    diagnostics.missing.push('Campaign Goal');
  }

  const ctaCount = enriched.CTA?.length || 0;
  if (ctaCount === 0 && website.ctaTexts?.length) {
    enriched.CTA = website.ctaTexts.slice(0, 3).map(t => ({ text: t, url: null }));
    diagnostics.enriched.push('Derived CTA from website evidence');
  } else if (ctaCount === 0) {
    enriched.CTA = [{ text: 'Get Started', url: null }];
    diagnostics.enriched.push('Using default CTA');
  }

  const currentKeywords = enriched.verifiedKeywords?.length || 0;
  if (currentKeywords < MINIMUM_REQUIREMENTS.keywords.count) {
    const normalizedSeo = normalizeSeoForExecution(seoIntel);
    const extraKeywords = (normalizedSeo?.keywords || []).slice(0, MINIMUM_REQUIREMENTS.keywords.count - currentKeywords);
    if (extraKeywords.length > 0) {
      enriched.verifiedKeywords = takeArray([...enriched.verifiedKeywords, ...extraKeywords], 20);
      diagnostics.enriched.push(`Added ${extraKeywords.length} keywords from SEO intelligence`);
    }
  }

  const currentGaps = enriched.contentGaps?.length || 0;
  if (currentGaps < MINIMUM_REQUIREMENTS.contentGaps.count) {
    const normalizedSeo = normalizeSeoForExecution(seoIntel);
    const extraGaps = (normalizedSeo?.contentGaps || []).slice(0, MINIMUM_REQUIREMENTS.contentGaps.count - currentGaps);
    if (extraGaps.length > 0) {
      enriched.contentGaps = takeArray([...enriched.contentGaps, ...extraGaps], 10);
      diagnostics.enriched.push(`Added ${extraGaps.length} content gaps from SEO intelligence`);
    }
  }

  const currentPersonas = enriched.targetPersonas?.length || 0;
  if (currentPersonas < MINIMUM_REQUIREMENTS.personas.count && audienceData?.buyerPersonas?.length) {
    enriched.targetPersonas = takeArray(audienceData.buyerPersonas, 5).map(p => ({
      name: p.name || p.title || null,
      role: p.role || null,
      painPoints: takeArray(p.painPoints, 5),
      goals: takeArray(p.goals, 5),
    }));
    diagnostics.enriched.push(`Added ${enriched.targetPersonas.length - currentPersonas} personas from audience intelligence`);
  } else if (currentPersonas < MINIMUM_REQUIREMENTS.personas.count) {
    const genericPersonas = [
      { name: 'Business Decision Makers', role: 'Executive', painPoints: ['ROI justification', 'Competitive pressure', 'Growth targets'], goals: ['Revenue growth', 'Market share', 'Operational excellence'] },
      { name: 'End Users', role: 'Team Member', painPoints: ['Inefficient workflows', 'Manual processes', 'Tool fragmentation'], goals: ['Productivity', 'Ease of use', 'Time savings'] },
      { name: 'Technical Evaluators', role: 'Technical Lead', painPoints: ['Integration complexity', 'Security compliance', 'Scalability concerns'], goals: ['Seamless integration', 'Enterprise security', 'Platform reliability'] },
    ];
    enriched.targetPersonas = genericPersonas;
    diagnostics.enriched.push('Using inferred audience personas');
  }

  enriched._enrichmentDiagnostics = diagnostics;
  enriched._enrichedAt = new Date().toISOString();

  return {
    brief: enriched,
    enriched: diagnostics.enriched.length > 0,
    diagnostics,
    sources: enriched._sources,
  };
}

export function checkBriefRequirements(brief) {
  const checks = [];
  const featureCount = brief.product?.features?.length || 0;
  const benefitCount = brief.product?.benefits?.length || 0;
  const painCount = brief.painPoints?.length || 0;
  const useCaseCount = brief.product?.useCases?.length || 0;
  const personaCount = brief.targetPersonas?.length || 0;
  const keywordCount = brief.verifiedKeywords?.length || 0;
  const gapCount = brief.contentGaps?.length || 0;
  const campaignGoal = brief.campaign?.goal || null;
  const ctaCount = brief.CTA?.length || 0;

  const results = [
    { key: 'features', label: 'Product Features', count: featureCount, required: MINIMUM_REQUIREMENTS.features.count, pass: featureCount >= MINIMUM_REQUIREMENTS.features.count },
    { key: 'benefits', label: 'Product Benefits', count: benefitCount, required: MINIMUM_REQUIREMENTS.benefits.count, pass: benefitCount >= MINIMUM_REQUIREMENTS.benefits.count },
    { key: 'painPoints', label: 'Pain Points', count: painCount, required: MINIMUM_REQUIREMENTS.painPoints.count, pass: painCount >= MINIMUM_REQUIREMENTS.painPoints.count },
    { key: 'useCases', label: 'Use Cases', count: useCaseCount, required: MINIMUM_REQUIREMENTS.useCases.count, pass: useCaseCount >= MINIMUM_REQUIREMENTS.useCases.count },
    { key: 'personas', label: 'Audience Personas', count: personaCount, required: MINIMUM_REQUIREMENTS.personas.count, pass: personaCount >= MINIMUM_REQUIREMENTS.personas.count },
    { key: 'keywords', label: 'SEO Keywords', count: keywordCount, required: MINIMUM_REQUIREMENTS.keywords.count, pass: keywordCount >= MINIMUM_REQUIREMENTS.keywords.count },
    { key: 'contentGaps', label: 'Content Gaps', count: gapCount, required: MINIMUM_REQUIREMENTS.contentGaps.count, pass: gapCount >= MINIMUM_REQUIREMENTS.contentGaps.count },
    { key: 'campaignGoal', label: 'Campaign Goal', count: campaignGoal ? 1 : 0, required: 1, pass: !!campaignGoal },
    { key: 'primaryCta', label: 'Primary CTA', count: ctaCount, required: 1, pass: ctaCount > 0 },
  ];

  const passed = results.every(r => r.pass);
  const failures = results.filter(r => !r.pass).map(r => r.label);
  const passing = results.filter(r => r.pass).length;

  return {
    passed,
    passing,
    total: results.length,
    failures,
    results,
    summary: `Brief quality: ${passing}/${results.length} checks passed${failures.length ? `, missing: ${failures.join(', ')}` : ''}`,
  };
}

export default { enrichContentBrief, checkBriefRequirements, MINIMUM_REQUIREMENTS };
