/**
 * Campaign Consistency Validator
 * Validates campaign output before persistence to catch contradictions,
 * unsupported metrics, and generic recommendations.
 */

const UNSUPPORTED_KPI_PATTERNS = [
  /roi/i, /revenue/i, /conversion\s*rate/i, /open\s*rate/i, /ctr/i,
  /click\s*through/i, /bounce\s*rate/i, /customer\s*(acquisition|count|base)/i,
  /traffic/i, /lead\s*score/i, /mql/i, /sql/i, /pipeline\s*value/i,
  /website\s*traffic/i, /page\s*views/i, /unique\s*visitors/i,
];

const CLAIM_PATTERNS_TO_REWRITE = [
  /ultimate/i, /best(-in|-of)?/i, /leading/i, /industry-leading/i,
  /guaranteed/i, /proven/i, /go\s*viral/i, /increase\s*conversions/i,
  /boost\s*revenue/i, /gain\s*a\s*competitive\s*edge/i,
  /take\s*your\s*content\s*to\s*the\s*next\s*level/i,
  /revolutionary/i, /game[- ]?changer/i, /cutting[- ]?edge/i,
  /world[- ]?class/i, /state[- ]?of[- ]?the[- ]?art/i,
];

const GENERIC_CHANNEL_PATTERNS = [
  /influencer\s*partnership/i, /referral\s*program/i, /webinar/i,
  /case\s*stud(y|ies)/i, /testimonial/i, /roi\s*calculator/i,
  /community\s*ama/i, /in[- ]?app\s*campaign/i,
];

export function validateCampaignConsistency(campaign, evidenceContext) {
  const issues = [];
  const evidenceStatus = evidenceContext?.checks || {};
  const hasSeo = evidenceStatus.hasSeoIntelligence || evidenceContext?.seo?.keywordOpportunities;
  const hasCompetitor = evidenceStatus.hasCompetitorIntelligence || evidenceContext?.competitor?.competitorAnalysis;
  const hasProduct = evidenceStatus.hasProductIntelligence || evidenceContext?.product?.productAnalysis;
  const hasWebsite = evidenceContext?.website?.url || evidenceContext?.website?.title;
  const hasCampaignPlan = evidenceStatus.existingCampaignPlanExists;

  // Check: audience existence
  if (!campaign.audienceSelection?.primary && evidenceContext?.audience?.buyerPersonas?.length > 0) {
    issues.push({ field: 'audienceSelection', severity: 'medium', message: 'Audience data exists but campaign does not reference it' });
  }

  // Check: No unsupported measured KPIs
  if (Array.isArray(campaign.kpiFramework)) {
    for (const kpi of campaign.kpiFramework) {
      const text = (kpi.kpi || kpi.name || kpi.metric || '') + ' ' + (kpi.howToMeasure || '') + ' ' + (kpi.status || '');
      for (const pattern of UNSUPPORTED_KPI_PATTERNS) {
        if (pattern.test(text)) {
          kpi.status = 'requires_api_integration';
          issues.push({ field: `kpiFramework.${kpi.kpi || kpi.name}`, severity: 'medium', message: `KPI "${kpi.kpi}" requires API integration not yet connected. Changed status to "requires_api_integration".` });
        }
      }
    }
  }

  // Check: No generic unsupported channel recommendations
  if (Array.isArray(campaign.channelRecommendations)) {
    for (const ch of campaign.channelRecommendations) {
      const text = (ch.channel || ch.recommendation || '') + ' ' + (ch.reason || '');
      for (const pattern of GENERIC_CHANNEL_PATTERNS) {
        if (pattern.test(text) && !ch._evidence_backed) {
          ch._requires_approval = true;
          issues.push({ field: `channelRecommendations.${ch.channel}`, severity: 'low', message: `"${ch.channel}" recommendation requires explicit approval before display.` });
        }
      }
    }
  }

  // Check: Marketing funnel has at least one stage
  if (!campaign.marketingFunnel || Object.keys(campaign.marketingFunnel).length === 0) {
    issues.push({ field: 'marketingFunnel', severity: 'medium', message: 'Marketing funnel is empty' });
  }

  // Check: No contradictory next actions
  if (Array.isArray(campaign.nextActions)) {
    if (hasSeo) {
      campaign.nextActions = campaign.nextActions.filter(a =>
        !(a.action?.toLowerCase().includes('seo') && a.action?.toLowerCase().includes('run'))
      );
    }
    if (hasCompetitor) {
      campaign.nextActions = campaign.nextActions.filter(a =>
        !(a.action?.toLowerCase().includes('competitor') && (a.action?.toLowerCase().includes('analysis') || a.action?.toLowerCase().includes('research')))
      );
    }
  }

  return {
    valid: issues.filter(i => i.severity === 'high').length === 0,
    issues,
    repaired: issues.filter(i => i.field && !i.field.startsWith('_')).length > 0,
    warnings: issues.filter(i => i.severity === 'low').map(i => i.message),
    repairs: issues.filter(i => i.field && !i.field.startsWith('_')).map(i => ({ field: i.field, action: i.message })),
  };
}

export function checkClaimAgainstEvidence(claim, evidence) {
  for (const pattern of CLAIM_PATTERNS_TO_REWRITE) {
    if (pattern.test(claim)) {
      return {
        status: 'UNSUPPORTED',
        action: 'REWRITE',
        suggestion: claim.replace(pattern, '').trim() || 'factual description',
      };
    }
  }
  return { status: 'SUPPORTED', action: 'KEEP', suggestion: claim };
}

export function rewriteClaims(text) {
  let result = text;
  for (const pattern of CLAIM_PATTERNS_TO_REWRITE) {
    result = result.replace(pattern, '');
  }
  return result.trim();
}

export default { validateCampaignConsistency, checkClaimAgainstEvidence, rewriteClaims };
