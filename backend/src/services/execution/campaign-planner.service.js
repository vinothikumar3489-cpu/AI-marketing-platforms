import { callAI } from "../../ai/services/aiRouter.service.js";

const PLAN_TYPES = {
  day_30: { label: '30 Day Campaign', days: 30 },
  day_60: { label: '60 Day Campaign', days: 60 },
  day_90: { label: '90 Day Campaign', days: 90 },
  quarterly: { label: 'Quarterly Campaign', days: 92 },
};

export { PLAN_TYPES };

export async function generateCampaignPlan(planType, context) {
  const typeConfig = PLAN_TYPES[planType];
  if (!typeConfig) throw new Error(`Unknown plan type: ${planType}`);

  const { productName, companyName, targetAudience, industry, productUsp, evidence } = context;

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);
  if (evidence?.website?.featuresText?.value?.length) evidenceLines.push(`Product Features: ${evidence.website.featuresText.value.slice(0, 5).join('; ')}`);
  if (evidence?.audience?.painPoints?.value?.length) evidenceLines.push(`Audience Pain Points: ${evidence.audience.painPoints.value.slice(0, 3).join('; ')}`);
  if (evidence?.audience?.personas?.value?.length) evidenceLines.push(`Buyer Personas: ${evidence.audience.personas.value.slice(0, 3).map(p => p.name || p.title).filter(Boolean).join('; ')}`);
  if (evidence?.competitors?.list?.value?.length) evidenceLines.push(`Competitors: ${evidence.competitors.list.value.slice(0, 3).map(c => c.name || c.url).filter(Boolean).join(', ')}`);
  if (evidence?.channels?.length) evidenceLines.push(`Channels: ${evidence.channels.map(c => c.channel).join(', ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a ${typeConfig.label} (exactly ${typeConfig.days} days) campaign plan. Use ONLY verified data below.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}
${evidenceLines.join('\n')}

CAMPAIGN PLAN STRUCTURE (return valid JSON array of campaign items):
[
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
]

RULES:
1. Do NOT include: budget, ROI projections, lead counts, conversion metrics, revenue estimates.
2. Every item must reference product-specific evidence from the CONTEXT section above.
3. Do NOT invent sample data, past performance, or conversion metrics.
4. Schedule phases must span exactly ${typeConfig.days} days.
5. Return ONLY valid JSON array. No markdown.`;

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
      let items = Array.isArray(result.data) ? result.data : (result.data.items || result.data.campaignItems || []);
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
    },
  };
}
