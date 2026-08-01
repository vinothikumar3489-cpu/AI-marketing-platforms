import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";

const PLAN_TYPES = {
  day_30: { label: '30 Day Campaign', days: 30 },
  day_60: { label: '60 Day Campaign', days: 60 },
  day_90: { label: '90 Day Campaign', days: 90 },
  quarterly: { label: 'Quarterly Campaign', days: 92 },
};

export { PLAN_TYPES };

function unwrapSourced(v) {
  if (v && typeof v === 'object' && 'value' in v && 'source' in v) return v.value;
  return v;
}

export async function generateCampaignPlan(planType, context) {
  const typeConfig = PLAN_TYPES[planType];
  if (!typeConfig) throw new Error(`Unknown plan type: ${planType}`);

  const { productName, companyName, targetAudience, industry, productUsp, evidence } = context;

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);

  const features = evidence?.features?.length ? evidence.features : (evidence?.website?.features || []);
  const featureNames = features.map(f => typeof f === 'string' ? f : (f.name || f.feature || f.value || '')).filter(Boolean).slice(0, 5);
  if (featureNames.length) evidenceLines.push(`Product Features: ${featureNames.join('; ')}`);

  const benefits = evidence?.benefits || [];
  const benefitNames = benefits.map(b => typeof b === 'string' ? b : (b.name || b.benefit || b.value || '')).filter(Boolean).slice(0, 5);
  if (benefitNames.length) evidenceLines.push(`Product Benefits: ${benefitNames.join('; ')}`);

  const painPoints = Array.isArray(unwrapSourced(evidence?.audience?.painPoints)) ? unwrapSourced(evidence?.audience?.painPoints) : [];
  const painText = painPoints.map(p => typeof p === 'string' ? p : (p.value || p.painPoint || p.title || '')).filter(Boolean).slice(0, 3);
  if (painText.length) evidenceLines.push(`Audience Pain Points: ${painText.join('; ')}`);

  const personas = Array.isArray(unwrapSourced(evidence?.audience?.personas)) ? unwrapSourced(evidence?.audience?.personas) : [];
  const personaNames = personas.map(p => typeof p === 'string' ? p : (p.name || p.title || p.persona || '')).filter(Boolean).slice(0, 3);
  if (personaNames.length) evidenceLines.push(`Buyer Personas: ${personaNames.join('; ')}`);

  const comps = Array.isArray(unwrapSourced(evidence?.competitors?.list)) ? unwrapSourced(evidence?.competitors?.list) : [];
  const compNames = comps.map(c => typeof c === 'string' ? c : (c.name || c.url || '')).filter(Boolean).slice(0, 3);
  if (compNames.length) evidenceLines.push(`Competitors: ${compNames.join(', ')}`);

  const channels = Array.isArray(evidence?.channels) ? evidence.channels : [];
  const channelNames = channels.map(c => (c && (c.channel || c.name)) || c).filter(Boolean).slice(0, 5);
  if (channelNames.length) evidenceLines.push(`Channels: ${channelNames.join(', ')}`);

  const seo = evidence?.seo || null;
  if (seo) {
    const seoParts = [];
    const seoScore = unwrapSourced(seo.score);
    if (seoScore != null) seoParts.push(`Score: ${seoScore}`);
    const primaryKws = (Array.isArray(unwrapSourced(seo.primary)) ? unwrapSourced(seo.primary) : Array.isArray(unwrapSourced(seo.primaryKeywords)) ? unwrapSourced(seo.primaryKeywords) : []).slice(0, 8).map(k => typeof k === 'string' ? k : (k.keyword || k)).filter(Boolean);
    if (primaryKws.length) seoParts.push(`Primary Keywords: ${primaryKws.join(', ')}`);
    const gaps = (Array.isArray(unwrapSourced(seo.contentGaps)) ? unwrapSourced(seo.contentGaps) : []).slice(0, 5).map(g => typeof g === 'string' ? g : (g.title || g.opportunity || '')).filter(Boolean);
    if (gaps.length) seoParts.push(`Content Gaps: ${gaps.join('; ')}`);
    if (seoParts.length) evidenceLines.push(`SEO Evidence: ${seoParts.join(' | ')}`);
  }

  const website = evidence?.website || null;
  const websiteTitle = unwrapSourced(website?.title);
  const ctaTexts = Array.isArray(unwrapSourced(website?.ctaTexts)) ? unwrapSourced(website?.ctaTexts) : [];
  if (websiteTitle) evidenceLines.push(`Website Title: ${websiteTitle}`);
  if (ctaTexts.length) evidenceLines.push(`Existing CTAs: ${ctaTexts.slice(0, 3).join('; ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a comprehensive ${typeConfig.label} (exactly ${typeConfig.days} days) marketing campaign plan. Use ONLY verified data below.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}
${evidenceLines.join('\n')}

COMPREHENSIVE CAMPAIGN PLAN STRUCTURE (return valid JSON object):
{
  "marketingStrategy": {
    "objective": "Primary campaign objective based on evidence",
    "goToMarket": "Go-to-market approach (direct, partner-led, product-led, etc.)",
    "positioning": "Market positioning statement",
    "differentiation": "Key differentiators from competitors"
  },
  "targeting": {
    "primaryPersona": "Primary buyer persona from evidence",
    "secondaryPersonas": ["Secondary persona 1", "Secondary persona 2"],
    "icp": "Ideal customer profile summary"
  },
  "customerJourney": {
    "awareness": ["Tactics for awareness stage"],
    "consideration": ["Tactics for consideration stage"],
    "decision": ["Tactics for decision stage"],
    "retention": ["Tactics for retention stage"]
  },
  "funnels": [
    {
      "name": "Funnel name (e.g., 'Lead Generation Funnel')",
      "stages": [
        {"stage": "Stage name", "tactic": "Tactic description", "channel": "Channel", "asset": "Asset type"}
      ]
    }
  ],
  "channels": [
    {
      "channel": "Channel name",
      "objective": "Channel-specific objective",
      "tactics": ["Tactic 1", "Tactic 2"],
      "contentTypes": ["Blog post", "Social post", "Email", etc.]
    }
  ],
  "contentCalendar": [
    {
      "week": "Week X-Y",
      "theme": "Weekly theme",
      "deliverables": [
        {"asset": "Asset type", "channel": "Channel", "topic": "Topic from evidence", "cta": "Call to action"}
      ]
    }
  ],
  "campaignItems": [
    {
      "objective": "Specific campaign objective based on evidence",
      "targetPersona": "Persona name from audience data, or null",
      "message": "Core message referencing product-specific evidence from CONTEXT",
      "channel": "Channel from verified data",
      "asset": "Asset type needed (blog post, email, social post, etc.)",
      "cta": "Single call to action",
      "measurement": "How to measure (e.g. 'track landing page visits in analytics')",
      "dependency": "Prerequisite for this item, or null",
      "schedule": { "phase": "Phase label", "weekRange": "Weeks X-Y" },
      "responsibleRole": "Team or role responsible"
    }
  ],
  "kpiFramework": {
    "awarenessMetrics": ["Metric 1", "Metric 2"],
    "considerationMetrics": ["Metric 1", "Metric 2"],
    "conversionMetrics": ["Metric 1", "Metric 2"],
    "retentionMetrics": ["Metric 1", "Metric 2"]
  }
}

RULES:
1. Do NOT include: specific budget amounts, ROI projections, lead counts, conversion metrics, revenue estimates.
2. Every item must reference product-specific evidence from the CONTEXT section above.
3. Do NOT invent sample data, past performance, or conversion metrics.
4. Schedule phases must span exactly ${typeConfig.days} days.
5. Content calendar must align with phases and evidence-based topics.
6. Return ONLY valid JSON object. No markdown.`;

  function isTacticSupportedByContext(item, ctx) {
    const evidenceText = JSON.stringify(ctx.evidence || {}).toLowerCase();
    const checkFields = [item.objective, item.message, item.channel, item.asset, item.cta, item.measurement].filter(Boolean);
    const allText = checkFields.join(' ').toLowerCase();

    const checks = [
      { tactic: 'webinar', evidence: 'webinar' },
      { tactic: 'case study', evidence: 'case study' },
      { tactic: 'testimonial', evidence: 'testimonial' },
      { tactic: 'roi calculator', evidence: 'roi' },
      { tactic: 'roi tool', evidence: 'roi' },
      { tactic: 'referral', evidence: 'referral' },
    ];

    return checks.every(({ tactic, evidence }) => {
      if (!allText.includes(tactic)) return true;
      return evidenceText.includes(evidence);
    });
  }

  function itemRequiresProductFeatures(item) {
    const text = [item.objective, item.message, item.asset, item.cta].filter(Boolean).join(' ').toLowerCase();
    const keywords = ['feature', 'product feature', 'capability', 'usp', 'differentiator', 'product-specific'];
    return keywords.some(kw => text.includes(kw));
  }

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      let items = Array.isArray(result.data) ? result.data : (result.data.items || result.data.campaignItems || result.data.campaignPlan || []);
      items = items.filter(item => {
        const tacticOk = isTacticSupportedByContext(item, context);
        const featureOk = context.productUsp || !itemRequiresProductFeatures(item);
        return tacticOk && featureOk;
      });
      return {
        campaignItems: items,
        planType,
        planLabel: typeConfig.label,
        days: typeConfig.days,
        _type: planType,
        _label: typeConfig.label,
        _days: typeConfig.days,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
        _evidenceVersion: '2.0.0',
        _evidenceSnapshotId: context.evidenceSnapshotId || null,
      };
    }
  } catch (e) {
    console.warn(`[CampaignPlanner] AI generation failed for ${planType}:`, e.message);
  }

  return null;
}

export async function generateCampaignPlannerPlan(context) {
  const types = Object.keys(PLAN_TYPES);
  const results = {};

  for (const type of types) {
    const plan = await generateCampaignPlan(type, context);
    if (plan) results[type] = plan;
  }

  return {
    plans: results,
    totalGenerated: Object.keys(results).length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'campaign_planner',
      evidenceSnapshotId: context.evidenceSnapshotId || null,
    },
  };
}
