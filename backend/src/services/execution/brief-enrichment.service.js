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

function extractFeatureName(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return null;
  return item.name || item.feature || item.title || item.value || item.capability || item.label || item.description || null;
}

function extractBenefitText(item) {
  if (typeof item === 'string') return item;
  if (!item || typeof item !== 'object') return null;
  return item.text || item.benefit || item.value || item.outcome || item.description || null;
}

function extractText(item) {
  if (!item) return null;
  if (typeof item === 'string') return item.trim();
  if (typeof item === 'object') return item.value || item.name || item.text || item.title || null;
  return null;
}

function deriveFeaturesFromEvidence(evidence) {
  const derived = new Map();
  const raw = evidence?.evidence || {};
  const website = raw.website || {};
  const textSources = [
    website.title, website.metaDescription, website.heroText,
    ...(website.ctaTexts || []),
    ...(Array.isArray(website.featuresText) ? website.featuresText : []),
    ...(Array.isArray(website.headings) ? website.headings.map(h => h.text || h) : []),
    ...(Array.isArray(website.keywords) ? website.keywords : []),
  ].filter(Boolean).join(' ').toLowerCase();

  const patterns = [
    { name: 'Analytics & Reporting', keywords: ['analytics', 'reporting', 'dashboard', 'metrics', 'tracking', 'insights', 'analytics dashboard', 'real-time reporting', 'performance metrics'] },
    { name: 'Automation', keywords: ['automation', 'automated', 'workflow', 'streamline', 'workflow automation', 'process automation'] },
    { name: 'AI & Machine Learning', keywords: ['ai', 'artificial intelligence', 'machine learning', 'ml', 'smart', 'intelligent', 'ai-powered', 'deep learning'] },
    { name: 'Integration & APIs', keywords: ['integration', 'connect', 'api', 'sync', 'embed', 'plugin', 'connector', 'marketplace'] },
    { name: 'Security & Compliance', keywords: ['security', 'secure', 'compliance', 'encrypt', 'privacy', 'gdpr', 'soc 2', 'access control', 'permissions'] },
    { name: 'Collaboration', keywords: ['collaboration', 'team', 'share', 'collaborate', 'coordinate', 'teamwork'] },
    { name: 'Content Management', keywords: ['content', 'manage', 'create', 'publish', 'organize', 'cms', 'content management'] },
    { name: 'Search & Discovery', keywords: ['search', 'discovery', 'find', 'explore', 'navigate', 'filter'] },
    { name: 'Personalization', keywords: ['personalization', 'personalize', 'customize', 'tailor', 'adaptive', 'customizable'] },
    { name: 'Real-time Processing', keywords: ['real-time', 'realtime', 'live', 'instant', 'immediate', 'real time'] },
    { name: 'Scalability & Performance', keywords: ['scale', 'scalable', 'enterprise', 'grow', 'high performance', 'enterprise-grade'] },
    { name: 'Reporting & Visualization', keywords: ['report', 'visualize', 'chart', 'graph', 'visualization', 'data visualization'] },
    { name: 'Templates & Library', keywords: ['template', 'library', 'asset', 'repository', 'blueprint'] },
    { name: 'Notifications & Alerts', keywords: ['notification', 'alert', 'notify', 'remind', 'push notification'] },
    { name: 'Data Import & Export', keywords: ['import', 'export', 'data import', 'data export', 'csv', 'bulk upload'] },
    { name: 'Mobile Access', keywords: ['mobile', 'app', 'mobile app', 'ios', 'android', 'mobile-friendly'] },
  ];

  patterns.forEach(({ name, keywords }) => {
    if (keywords.some(k => textSources.includes(k))) {
      derived.set(name, {
        name,
        description: null,
        benefit: null,
        evidence: 'evidence_snapshot',
        inferenceStatus: 'AI_INFERRED',
      });
    }
  });

  return Array.from(derived.values());
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
  const sentences = summary.split(/[.!?]+/).filter(Boolean);
  const derived = [];

  sentences.forEach((s) => {
    const trimmed = s.trim();
    if (trimmed.length > 10) {
      derived.push({
        name: trimmed.length > 60 ? trimmed.substring(0, 60).trim() + '...' : trimmed,
        description: trimmed,
        benefit: null,
        evidence: null,
        inferenceStatus: 'AI_INFERRED',
      });
    }
  });

  return derived.slice(0, 8);
}

function deriveBenefitsFromSummary(summary) {
  if (!summary) return [];
  const trimmed = summary.length > 100 ? summary.substring(0, 100) + '...' : summary;
  return [{ text: trimmed, evidence: null, inferenceStatus: 'AI_INFERRED' }];
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
    'challenge', 'complex', 'manual', 'slow', 'cost', 'inefficient',
    'data', 'integration', 'scale', 'visibility', 'problem', 'difficult',
  ];
  const matched = summary.split(/[.!?]+/).filter(Boolean).map(s => s.trim()).filter(s => {
    if (s.length < 10) return false;
    const lower = s.toLowerCase();
    return painPointIndicators.some(w => lower.includes(w));
  });
  return takeArray(matched, 8);
}

function deriveUseCasesFromFeatures(features) {
  const featureNames = (features || []).map(f => typeof f === 'string' ? f : (f.name || '')).filter(Boolean);
  return featureNames.slice(0, 3).map(name => ({
    scenario: `Implementing ${name}`,
    solution: null,
    outcome: null,
  }));
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

  console.info('[Enrich] Starting enrichment', { chatId, userId,
    initialFeatures: brief.product?.features?.length || 0,
    initialBenefits: brief.product?.benefits?.length || 0,
    initialPainPoints: brief.painPoints?.length || 0,
    initialUseCases: brief.product?.useCases?.length || 0,
    initialKeywords: brief.verifiedKeywords?.length || 0,
    initialContentGaps: brief.contentGaps?.length || 0,
    initialPersonas: brief.targetPersonas?.length || 0,
    initialCTA: brief.CTA?.length || 0,
    hasCampaignGoal: !!brief.campaign?.goal,
  });

  const campaignIntel = await prisma.campaignIntelligence.findFirst({ where: { chatId, userId } }).catch(() => null);
  const evidenceSnapshot = await getLatestEvidenceSnapshot({ prisma, userId, chatId }).catch(() => null);
  const productIntel = await getProductIntelligenceForChat({ prisma, userId, chatId }).catch(() => null);
  const seoIntel = await getSeoIntelligenceForChat({ prisma, userId, chatId }).catch(() => null);

  console.info('[Enrich] Data loaded', {
    hasCampaignIntel: !!campaignIntel,
    hasEvidenceSnapshot: !!evidenceSnapshot,
    hasProductIntel: !!productIntel,
    hasSeoIntel: !!seoIntel,
  });

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

  const summary = productAnalysis.summary || productAnalysis.productSummary || enriched.product?.summary || '';

  // --- Campaign Goal Mapping (Task 4) ---
  enriched.campaign = {
    ...(enriched.campaign || {}),
    goal: enriched.campaign?.goal || campaignData.campaignGoals?.[0] || campaignData.goals?.[0] || campaignData.objective || campaignData.businessGoal || campaignData.businessObjective || null,
    businessGoal: campaignData.businessGoal || campaignData.businessObjective || enriched.campaign?.businessGoal || null,
    objective: campaignData.objective || campaignData.campaignGoals?.[0] || enriched.campaign?.objective || null,
    timeline: campaignData.timeline || campaignData.campaignTimeline || enriched.campaign?.timeline || null,
    channels: channelData?.recommendedChannels?.map(ch => ({
      channel: ch.channel || ch.name,
      priority: ch.priority || null,
      reason: ch.reason || null,
    })).filter(ch => ch.channel) || enriched.campaign?.channels || [],
    marketingFunnel: campaignData.funnelStage || campaignData.marketingFunnel || enriched.campaign?.marketingFunnel || null,
    creativeAngles: takeArray(campaignData.creativeAngles || campaignData.messagingPillars || enriched.campaign?.creativeAngles, 5),
    brandVoice: campaignData.brandVoice || productAnalysis.brandVoice || enriched.campaign?.brandVoice || null,
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

  console.info('[Enrich] Normalizer output', {
    featuresCount: allFeatures.length,
    benefitsCount: allBenefits.length,
    painPointsCount: allPainPoints.length,
    useCasesCount: allUseCases.length,
    normalizerWarnings: featuresFromNormalizer.warnings,
  });

  // --- Feature Derivation (ensure minimum 5) ---
  if (allFeatures.length < MINIMUM_REQUIREMENTS.features.count) {
    const fromEvidence = deriveFeaturesFromEvidence(evidenceSnapshot);
    const fromSummary = deriveFeaturesFromSummary(summary);
    const combined = [...allFeatures, ...fromEvidence, ...fromSummary];
    const seen = new Set();
    allFeatures = combined.filter(f => {
      const key = extractFeatureName(f)?.toLowerCase() || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fromEvidence.length > 0) diagnostics.enriched.push(`Derived ${fromEvidence.length} features from Evidence Snapshot`);
    if (fromSummary.length > 0) diagnostics.enriched.push(`Derived ${fromSummary.length} features from product summary`);
  }

  console.info('[Enrich] After feature derivation', { count: allFeatures.length });

  // --- Benefit Derivation (ensure minimum 5) ---
  if (allBenefits.length < MINIMUM_REQUIREMENTS.benefits.count) {
    const fromFeatures = deriveBenefitsFromFeatures(allFeatures);
    const fromSummary = deriveBenefitsFromSummary(summary);
    const combined = [...allBenefits, ...fromFeatures, ...fromSummary];
    const seen = new Set();
    allBenefits = combined.filter(b => {
      const key = extractBenefitText(b)?.toLowerCase() || '';
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fromFeatures.length > 0) diagnostics.enriched.push(`Derived ${fromFeatures.length} benefits from feature benefits`);
    if (fromSummary.length > 0) diagnostics.enriched.push(`Derived ${fromSummary.length} benefits from product summary`);
  }

  console.info('[Enrich] After benefit derivation', { count: allBenefits.length });

  // --- Pain Points Derivation (ensure minimum 5) ---
  if (allPainPoints.length < MINIMUM_REQUIREMENTS.painPoints.count) {
    const fromCompetitors = derivePainPointsFromCompetitors(enriched.validatedCompetitors);
    const fromSummary = derivePainPointsFromSummary(summary);
    const combined = [...allPainPoints, ...fromCompetitors, ...fromSummary];
    const seen = new Set();
    allPainPoints = combined.filter(p => {
      const key = (typeof p === 'string' ? p : extractText(p) || '').toLowerCase().trim();
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
    if (fromCompetitors.length > 0) diagnostics.enriched.push(`Derived ${fromCompetitors.length} pain points from competitor weaknesses`);
    if (allPainPoints.length > 0 && fromCompetitors.length === 0) diagnostics.enriched.push(`Derived ${allPainPoints.length} pain points from product summary`);
  }

  console.info('[Enrich] After pain point derivation', { count: allPainPoints.length });

  // --- Use Cases Derivation (ensure minimum 3) ---
  if (allUseCases.length < MINIMUM_REQUIREMENTS.useCases.count) {
    const derived = deriveUseCasesFromFeatures(allFeatures);
    allUseCases = [...allUseCases, ...derived];
    if (derived.length > 0) diagnostics.enriched.push(`Derived ${derived.length} use cases from feature names`);
  }

  console.info('[Enrich] After use case derivation', { count: allUseCases.length });

  enriched.product.features = takeArray(allFeatures, 15);
  enriched.product.benefits = takeArray(allBenefits, 10);
  enriched.painPoints = takeArray(allPainPoints, 10);
  enriched.product.useCases = takeArray(allUseCases, 5);

  console.info('[Enrich] Derived data final', {
    featuresCount: enriched.product.features.length,
    benefitsCount: enriched.product.benefits.length,
    painPointsCount: enriched.painPoints.length,
    useCasesCount: enriched.product.useCases.length,
  });

  // --- Campaign Goal (Task 4) ---
  if (!enriched.campaign.goal) {
    diagnostics.missing.push('Campaign Goal');
  }
  console.info('[Enrich] Campaign goal', { goal: enriched.campaign.goal || null });

  // --- CTA Derivation ---
  const ctaCount = enriched.CTA?.length || 0;
  if (ctaCount === 0 && website.ctaTexts?.length) {
    enriched.CTA = website.ctaTexts.slice(0, 3).map(t => ({ text: t, url: null }));
    diagnostics.enriched.push('Derived CTA from website evidence');
  } else if (ctaCount === 0) {
    enriched.CTA = [];
    diagnostics.missing.push('Primary CTA');
  }
  console.info('[Enrich] CTA', { count: enriched.CTA?.length || 0, cta: enriched.CTA?.[0]?.text });

  // --- Keywords (Task 3) ---
  const currentKeywords = enriched.verifiedKeywords?.length || 0;
  if (currentKeywords < MINIMUM_REQUIREMENTS.keywords.count) {
    const normalizedSeo = normalizeSeoForExecution(seoIntel);
    const seoKeywords = (normalizedSeo?.keywords || []);
    const extraKeywords = seoKeywords.slice(0, MINIMUM_REQUIREMENTS.keywords.count - currentKeywords);
    if (extraKeywords.length > 0) {
      enriched.verifiedKeywords = takeArray([...enriched.verifiedKeywords, ...extraKeywords], 20);
      diagnostics.enriched.push(`Added ${extraKeywords.length} keywords from SEO intelligence`);
    }
    console.info('[Enrich] SEO keywords', { total: seoKeywords.length, added: extraKeywords.length, current: currentKeywords });
  }

  // --- Content Gaps (Task 3 - bypass broken normalizer) ---
  const currentGaps = enriched.contentGaps?.length || 0;
  if (currentGaps < MINIMUM_REQUIREMENTS.contentGaps.count) {
    let allGaps = [];

    // Read directly from contentGapRecord (this has the real data)
    const contentGapRecord = seoIntel?.contentGapRecord;
    if (contentGapRecord?.contentGaps && Array.isArray(contentGapRecord.contentGaps)) {
      allGaps = contentGapRecord.contentGaps.map(g => ({
        topic: g.topic || g.opportunity || g.title || (typeof g === 'string' ? g : ''),
        reason: g.reason || g.gap || g.description || null,
        priority: g.priority ?? g.importance ?? null,
      })).filter(g => g.topic);
      diagnostics.enriched.push(`Loaded ${allGaps.length} content gaps from contentGapRecord`);
    }

    // Fallback: try normalized SEO
    if (allGaps.length < MINIMUM_REQUIREMENTS.contentGaps.count) {
      const normalizedSeo = normalizeSeoForExecution(seoIntel);
      if (normalizedSeo?.contentGaps?.length > 0) {
        allGaps = [...allGaps, ...normalizedSeo.contentGaps];
      }
    }

    // Fallback: try direct seoIntel.contentGaps (wrapping object)
    if (allGaps.length < MINIMUM_REQUIREMENTS.contentGaps.count && seoIntel?.contentGaps) {
      const obj = seoIntel.contentGaps;
      if (Array.isArray(obj)) {
        allGaps = [...allGaps, ...obj.map(g => ({ topic: g.topic || g.opportunity || g.title || (typeof g === 'string' ? g : ''), reason: g.reason || g.gap || null, priority: g.priority || null })).filter(g => g.topic)];
      } else if (obj.contentGaps && Array.isArray(obj.contentGaps)) {
        allGaps = [...allGaps, ...obj.contentGaps.map(g => ({ topic: g.topic || g.opportunity || g.title || (typeof g === 'string' ? g : ''), reason: g.reason || g.gap || null, priority: g.priority || null })).filter(g => g.topic)];
      }
    }

    const extraGaps = allGaps.slice(0, MINIMUM_REQUIREMENTS.contentGaps.count - currentGaps);
    if (extraGaps.length > 0) {
      enriched.contentGaps = takeArray([...enriched.contentGaps, ...extraGaps], 10);
      diagnostics.enriched.push(`Added ${extraGaps.length} content gaps`);
    }
    console.info('[Enrich] Content gaps', { totalFound: allGaps.length, added: extraGaps.length, current: currentGaps });
  }

  const currentPersonas = enriched.targetPersonas?.length || 0;
  if (currentPersonas < MINIMUM_REQUIREMENTS.personas.count) {
    const fromAudience = audienceData?.buyerPersonas || [];
    if (fromAudience.length > 0) {
      enriched.targetPersonas = takeArray(fromAudience, 5).map(p => ({
        name: extractText(p.name || p.title) || null,
        role: p.role || null,
        painPoints: takeArray(Array.isArray(p.painPoints) ? p.painPoints : [], 5),
        goals: takeArray(Array.isArray(p.goals) ? p.goals : [], 5),
      }));
      diagnostics.enriched.push(`Added ${enriched.targetPersonas.length} personas from audience intelligence`);
    }
  }
  if ((enriched.targetPersonas?.length || 0) < MINIMUM_REQUIREMENTS.personas.count) {
    diagnostics.missing.push('Audience Personas');
  }
  console.info('[Enrich] Personas', { count: enriched.targetPersonas?.length || 0 });

  // --- Final validation trace ---
  const featureCount = enriched.product?.features?.length || 0;
  const benefitCount = enriched.product?.benefits?.length || 0;
  const painCount = enriched.painPoints?.length || 0;
  const useCaseCount = enriched.product?.useCases?.length || 0;
  const personaCount = enriched.targetPersonas?.length || 0;
  const keywordCount = enriched.verifiedKeywords?.length || 0;
  const gapCount = enriched.contentGaps?.length || 0;
  const hasCampaignGoal = !!enriched.campaign?.goal;

  console.info('[Enrich] Final counts', {
    features: featureCount, benefits: benefitCount, painPoints: painCount,
    useCases: useCaseCount, personas: personaCount, keywords: keywordCount,
    contentGaps: gapCount, campaignGoal: hasCampaignGoal, cta: ctaCount,
  });

  const passing = [
    { k: 'features', v: featureCount, r: MINIMUM_REQUIREMENTS.features.count, p: featureCount >= MINIMUM_REQUIREMENTS.features.count },
    { k: 'benefits', v: benefitCount, r: MINIMUM_REQUIREMENTS.benefits.count, p: benefitCount >= MINIMUM_REQUIREMENTS.benefits.count },
    { k: 'painPoints', v: painCount, r: MINIMUM_REQUIREMENTS.painPoints.count, p: painCount >= MINIMUM_REQUIREMENTS.painPoints.count },
    { k: 'useCases', v: useCaseCount, r: MINIMUM_REQUIREMENTS.useCases.count, p: useCaseCount >= MINIMUM_REQUIREMENTS.useCases.count },
    { k: 'personas', v: personaCount, r: MINIMUM_REQUIREMENTS.personas.count, p: personaCount >= MINIMUM_REQUIREMENTS.personas.count },
    { k: 'keywords', v: keywordCount, r: MINIMUM_REQUIREMENTS.keywords.count, p: keywordCount >= MINIMUM_REQUIREMENTS.keywords.count },
    { k: 'contentGaps', v: gapCount, r: MINIMUM_REQUIREMENTS.contentGaps.count, p: gapCount >= MINIMUM_REQUIREMENTS.contentGaps.count },
    { k: 'campaignGoal', v: hasCampaignGoal ? 1 : 0, r: 1, p: hasCampaignGoal },
    { k: 'primaryCta', v: ctaCount, r: 1, p: ctaCount > 0 },
  ];

  const failures = passing.filter(x => !x.p).map(x => x.k);
  if (failures.length > 0) {
    console.warn('[Enrich] Failing requirements', failures);
  }
  console.info('[Enrich] Enrichment complete', { passed: passing.filter(x => x.p).length, total: passing.length, failures });

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
