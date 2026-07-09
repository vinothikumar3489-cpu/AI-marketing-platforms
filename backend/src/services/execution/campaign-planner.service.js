import { callAI } from "../../ai/services/aiRouter.service.js";

const PLAN_TYPES = {
  day_30: { label: '30 Day Campaign', days: 30 },
  day_60: { label: '60 Day Campaign', days: 60 },
  day_90: { label: '90 Day Campaign', days: 90 },
  quarterly: { label: 'Quarterly Campaign', days: 90 },
  annual: { label: 'Annual Campaign', days: 365 },
};

export { PLAN_TYPES };

export async function generateCampaignPlan(planType, context) {
  const typeConfig = PLAN_TYPES[planType];
  if (!typeConfig) throw new Error(`Unknown plan type: ${planType}`);

  const { productName, companyName, targetAudience, industry, totalBudget, seoData, growthData, productUsp, evidence } = context;

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);
  if (evidence?.website?.featuresText?.length) evidenceLines.push(`Product Features: ${evidence.website.featuresText.slice(0, 5).join('; ')}`);
  if (evidence?.website?.ctaTexts?.length) evidenceLines.push(`Product CTAs: ${evidence.website.ctaTexts.join('; ')}`);
  if (evidence?.audience?.painPoints?.length) evidenceLines.push(`Audience Pain Points: ${evidence.audience.painPoints.slice(0, 3).join('; ')}`);
  if (evidence?.audience?.personas?.length) evidenceLines.push(`Buyer Personas: ${evidence.audience.personas.slice(0, 3).map(p => p.name || p.title).filter(Boolean).join('; ')}`);
  if (evidence?.competitors?.list?.length) evidenceLines.push(`Competitors: ${evidence.competitors.list.slice(0, 3).map(c => c.name || c.url).filter(Boolean).join(', ')}`);
  if (evidence?.seo?.issues?.length) evidenceLines.push(`SEO Issues to Address: ${evidence.seo.issues.slice(0, 5).map(i => i.action).join('; ')}`);
  if (evidence?.seo?.contentOpportunities?.length) evidenceLines.push(`SEO Content Opportunities: ${evidence.seo.contentOpportunities.slice(0, 5).map(o => o.opportunity).join('; ')}`);
  if (evidence?.channels?.length) evidenceLines.push(`Recommended Channels: ${evidence.channels.map(c => c.channel).join(', ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a ${typeConfig.label} (${typeConfig.days} days) marketing campaign plan. Use ONLY the verified product/company data below. Every activity, KPI, and risk must reference actual evidence.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${totalBudget ? `\nTotal Budget: ${totalBudget}` : ''}${seoData ? `\nSEO Data Available: ${seoData}` : ''}${growthData ? `\nGrowth Data Available: ${growthData}` : ''}
${evidenceLines.join('\n')}

PLAN DURATION: ${typeConfig.label} (${typeConfig.days} days)

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "campaignName": "Campaign name referencing product/company",
  "campaignGoal": "Primary campaign goal based on evidence-backed needs",
  "budget": {
    "total": null,
    "allocations": {}
  },
  "expectedROI": null,
  "kpis": {
    "primary": [{ "metric": "metric name based on evidence", "target": "target value", "measurementMethod": "how to measure" }],
    "secondary": [{ "metric": "metric name", "target": "target value" }]
  },
  "timeline": {
    "phases": [
      { "phase": "Phase name", "duration": "timeframe", "activities": ["activity referencing evidence"] }
    ],
    "milestones": [{ "date": "timeline", "milestone": "description", "successCriteria": "criteria" }]
  },
  "owner": "Primary owner",
  "dependencies": ["dependency1", "dependency2"],
  "priority": "High / Medium / Low",
  "risk": {
    "risks": [{ "risk": "description based on evidence gaps", "mitigation": "mitigation strategy", "likelihood": "High/Medium/Low", "impact": "High/Medium/Low" }]
  },
  "businessJustification": "Business justification based on evidence-backed product needs",
  "evidence": { "source": "campaign_planner", "confidence": null, "dataSource": "ai_generation" }
}

RULES:
1. Budget must be null unless explicitly provided.
2. KPIs must be specific, measurable, and based on evidence.
3. Timeline phases must cover the full ${typeConfig.days} days.
4. Risk assessment must be realistic and based on evidence gaps.
5. Do NOT invent fake past performance data, ROI, or conversion assumptions.
6. Every recommendation must reference evidence.
7. Return ONLY valid JSON. No markdown code fences.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        _type: planType,
        _label: typeConfig.label,
        _days: typeConfig.days,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
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
