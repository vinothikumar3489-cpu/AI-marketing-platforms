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

  const { productName, companyName, targetAudience, industry, totalBudget, seoData, growthData } = context;

  const prompt = `Generate a ${typeConfig.label} (${typeConfig.days} days) marketing campaign plan.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${totalBudget ? `\nTotal Budget: ${totalBudget}` : ''}${seoData ? `\nSEO Data Available: ${seoData}` : ''}${growthData ? `\nGrowth Data Available: ${growthData}` : ''}

PLAN DURATION: ${typeConfig.label} (${typeConfig.days} days)

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "campaignName": "Campaign name",
  "campaignGoal": "Primary campaign goal",
  "budget": {
    "total": "Total budget (or 'To be determined')",
    "allocations": { "channel_or_activity": "amount or percentage" }
  },
  "expectedROI": "Estimated ROI (or 'To be determined based on actual performance')",
  "kpis": {
    "primary": [{ "metric": "metric name", "target": "target value", "measurementMethod": "how to measure" }],
    "secondary": [{ "metric": "metric name", "target": "target value" }]
  },
  "timeline": {
    "phases": [
      { "phase": "Phase name", "duration": "timeframe", "activities": ["activity1", "activity2"] }
    ],
    "milestones": [{ "date": "timeline", "milestone": "description", "successCriteria": "criteria" }]
  },
  "owner": "Primary owner",
  "dependencies": ["dependency1", "dependency2"],
  "priority": "High / Medium / Low",
  "risk": {
    "risks": [{ "risk": "description", "mitigation": "mitigation strategy", "likelihood": "High/Medium/Low", "impact": "High/Medium/Low" }]
  },
  "businessJustification": "Clear business justification for this campaign",
  "evidence": { "source": "campaign_planner", "confidence": 85, "dataSource": "ai_generation" }
}

RULES:
1. Budget must be "To be determined" unless explicitly provided.
2. KPIs must be specific and measurable.
3. Timeline phases must cover the full ${typeConfig.days} days.
4. Risk assessment must be realistic.
5. Do NOT invent fake past performance data.
6. Return ONLY valid JSON. No markdown code fences.`;

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
