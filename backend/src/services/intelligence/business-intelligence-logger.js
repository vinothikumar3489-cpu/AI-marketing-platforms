const LOG_PREFIX = '[Business Intelligence]';

export function logCompanyCollected(data) {
  console.log(`${LOG_PREFIX} Company collected:`, {
    name: data.name,
    domain: data.domain,
    industry: data.industry,
    hasFunding: !!data.fundingStage,
    techStack: data.technologyStack?.length || 0,
    pricingTiers: data.pricingTiers?.length || 0
  });
}

export function logTechnologyCollected(technologies) {
  console.log(`${LOG_PREFIX} Technology collected:`, {
    total: technologies.length,
    framework: technologies.filter(t => t.category === 'framework').map(t => t.name),
    cms: technologies.filter(t => t.category === 'cms').map(t => t.name),
    analytics: technologies.filter(t => t.category === 'analytics').map(t => t.name)
  });
}

export function logPricingCollected(pricing) {
  console.log(`${LOG_PREFIX} Pricing collected:`, {
    tiers: pricing?.tiers?.length || 0,
    hasFree: !!pricing?.tiers?.find(t => t.name?.toLowerCase() === 'free'),
    hasEnterprise: !!pricing?.tiers?.find(t => t.name?.toLowerCase().includes('enterprise')),
    source: pricing?.source || 'Unknown'
  });
}

export function logCompetitorsCollected(competitors) {
  console.log(`${LOG_PREFIX} Competitors collected:`, {
    total: competitors.length,
    direct: competitors.filter(c => c.type === 'direct').map(c => c.name),
    indirect: competitors.filter(c => c.type === 'indirect').map(c => c.name),
    sources: [...new Set(competitors.map(c => c.source))]
  });
}

export function logMarketCollected(market) {
  console.log(`${LOG_PREFIX} Market collected:`, {
    tam: market.tam || 'Unknown',
    sam: market.sam || 'Unknown',
    som: market.som || 'Unknown',
    growthRate: market.growthRate || 'Unknown',
    trends: market.trends?.length || 0
  });
}

export function logAudienceCollected(audience) {
  console.log(`${LOG_PREFIX} Audience collected:`, {
    personas: audience.personas?.length || 0,
    segments: audience.segments?.length || 0,
    sources: audience.sources?.length || 0
  });
}

export function logStrategyGenerated(strategy) {
  console.log(`${LOG_PREFIX} Strategy generated:`, {
    channels: strategy.channels?.length || 0,
    recommendations: strategy.recommendations?.length || 0,
    timeline: strategy.timeline || 'Unknown'
  });
}

export function logReportGenerated(report) {
  console.log(`${LOG_PREFIX} Report generated:`, {
    sections: Object.keys(report).length,
    hasExecutiveSummary: !!report.executiveSummary,
    hasStrategicAssessment: !!report.strategicAssessment,
    hasCompetitiveLandscape: !!report.competitiveLandscape,
    hasGrowthOpportunities: !!report.growthOpportunities,
    hasActionPlan: !!report.actionPlan
  });
}
