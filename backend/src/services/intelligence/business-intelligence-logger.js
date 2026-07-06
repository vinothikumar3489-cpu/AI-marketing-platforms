const LOG_PREFIX = '[Business Intelligence]';

export function logCompanyCollected(data) {
  console.log(`${LOG_PREFIX} Company collected:`, {
    name: data.name,
    domain: data.domain,
    industry: data.industry,
    businessModel: data.businessModel || data.type,
    hasFunding: !!data.fundingStage,
    headquarters: data.headquarters || 'Unknown',
    employeeEstimate: data.employeeEstimate || 'Unknown',
    socialChannels: data.socialChannels?.length || 0
  });
}

export function logTechnologyCollected(technologies) {
  const categories = {};
  for (const t of technologies) {
    const cat = t.category || 'unknown';
    categories[cat] = (categories[cat] || 0) + 1;
  }
  console.log(`${LOG_PREFIX} Technology collected:`, {
    total: technologies.length,
    categories,
    highConfidence: technologies.filter(t => (t.confidence || 0) >= 80).map(t => t.name)
  });
}

export function logPricingCollected(pricing) {
  console.log(`${LOG_PREFIX} Pricing collected:`, {
    tiers: pricing?.tiers?.length || 0,
    hasFree: !!pricing?.hasFree,
    hasFreeTrial: !!pricing?.hasTrial,
    hasEnterprise: !!pricing?.hasEnterprise,
    currency: pricing?.currency || 'Unknown',
    billingPeriods: pricing?.billingPeriods || [],
    source: pricing?.source || 'Unknown'
  });
}

export function logCompetitorsCollected(competitors) {
  const all = competitors.all || (Array.isArray(competitors) ? competitors : []);
  console.log(`${LOG_PREFIX} Competitors collected:`, {
    total: all.length,
    direct: (competitors.direct || []).map(c => c.name),
    indirect: (competitors.indirect || []).map(c => c.name),
    emerging: (competitors.emerging || []).map(c => c.name),
    sources: [...new Set(all.map(c => c.source).filter(Boolean))]
  });
}

export function logMarketCollected(market) {
  console.log(`${LOG_PREFIX} Market collected:`, {
    tam: market.tam || 'Unknown',
    sam: market.sam || 'Unknown',
    som: market.som || 'Unknown',
    industrySize: market.industrySize || 'Unknown',
    growthRate: market.growthRate || 'Unknown',
    trends: market.trends?.length || 0,
    regulations: market.regulations?.length || 0,
    investmentTrends: market.investmentTrends?.length || 0
  });
}

export function logAudienceCollected(audience) {
  console.log(`${LOG_PREFIX} Audience collected:`, {
    icp: audience.icp?.length || 0,
    personas: audience.personas?.length || 0,
    decisionMakers: audience.decisionMakers?.length || 0,
    buyingCommittee: audience.buyingCommittee?.length || 0,
    painPoints: audience.painPoints?.length || 0,
    buyingTriggers: audience.buyingTriggers?.length || 0,
    hasLTV: !!audience.lifetimeValue,
    channels: audience.channels?.length || 0,
    sources: audience.sources?.length || 0
  });
}

export function logStrategyGenerated(strategy) {
  console.log(`${LOG_PREFIX} Strategy generated:`, {
    channels: strategy.channels?.length || 0,
    recommendations: strategy.recommendations?.length || 0,
    timeline: strategy.timeline || '7-365 days',
    hasPriorities: !!strategy.priorities,
    hasActionPlan: !!strategy.actionPlan
  });
}

export function logReportGenerated(report) {
  console.log(`${LOG_PREFIX} Report generated:`, {
    sections: Object.keys(report).length,
    hasExecutiveSummary: !!report.executiveSummary,
    hasCompanyOverview: !!report.companyOverview,
    hasBusinessModel: !!report.businessModel,
    hasRevenueModel: !!report.revenueModel,
    hasGrowthStage: !!report.growthStage,
    hasProductMaturity: !!report.productMaturity,
    hasMarketPosition: !!report.marketPosition,
    hasSWOT: !!report.swot,
    hasKeyFindings: !!report.keyFindings,
    hasTopPriorities: !!report.topPriorities,
    hasExecutiveRecommendation: !!report.executiveRecommendation,
    confidenceLevel: report.executiveSummary?.confidenceLevel || 'Unknown'
  });
}
