export function generateExecutiveStory(intelligence) {
  const company = intelligence.companyIntelligence || {};
  const technology = intelligence.technologyIntelligence || {};
  const pricing = intelligence.pricingIntelligence || {};
  const competitors = intelligence.competitorIntelligence || {};
  const market = intelligence.marketIntelligence || {};
  const audience = intelligence.audienceIntelligence || {};

  const companyName = company.name || 'Unknown';
  const industry = company.industry || 'Unknown';
  const directCompetitors = (competitors.direct || []).map(c => c.name).join(', ') || 'Unknown';
  const indirectCompetitors = (competitors.indirect || []).map(c => c.name).join(', ') || 'Unknown';

  const techSummary = [
    ...(technology.framework?.length ? [`${technology.framework.join(', ')}`] : []),
    ...(technology.cms?.length ? [`CMS: ${technology.cms.join(', ')}`] : []),
    ...(technology.cloudProvider?.length ? [`Cloud: ${technology.cloudProvider.join(', ')}`] : []),
    ...(technology.analytics?.length ? [`Analytics: ${technology.analytics.join(', ')}`] : []),
    ...(technology.crm?.length ? [`CRM: ${technology.crm.join(', ')}`] : [])
  ].join('; ') || 'Insufficient evidence';

  const evidenceSources = intelligence.evidence?.sources || [];
  const evidenceWarnings = intelligence.evidence?.warnings || [];

  return {
    executiveSummary: {
      title: `Strategic Business Assessment: ${companyName}`,
      company: companyName,
      industry,
      assessmentDate: new Date().toISOString().split('T')[0],
      methodology: 'Enterprise-grade market intelligence collected from verified sources including DataForSEO SERP data, Tavily research, web scraping, and technology fingerprinting.',
      confidenceLevel: evidenceSources.length > 3 ? 'High' : evidenceSources.length > 0 ? 'Medium' : 'Low',
      evidenceSourcesUsed: evidenceSources.length,
      dataGaps: evidenceWarnings.length
    },
    businessSummary: {
      companyOverview: {
        name: companyName,
        domain: company.domain || 'Unknown',
        industry,
        category: company.category || 'Unknown',
        subCategory: company.subCategory || 'Unknown',
        businessModel: company.businessModel || 'Unknown',
        targetMarket: company.targetMarket || 'Unknown',
        b2bOrB2C: company.b2bOrB2C || 'Unknown',
        headquarters: company.headquarters || 'Unknown',
        launchYear: company.launchYear || 'Unknown',
        employeeEstimate: company.employeeEstimate || 'Unknown',
        fundingStage: company.fundingStage || 'Unknown',
        fundingAmount: company.fundingAmount || 'Unknown'
      },
      technologyInfrastructure: {
        stack: technology.technologies || [],
        framework: technology.framework || ['Unknown'],
        cms: technology.cms || ['Unknown'],
        cloudProvider: technology.cloudProvider || ['Unknown'],
        cdn: technology.cdn || ['Unknown'],
        analytics: technology.analytics || ['Unknown'],
        crm: technology.crm || ['Unknown'],
        marketingAutomation: technology.marketingAutomation || ['Unknown'],
        paymentProviders: technology.paymentProviders || ['Unknown'],
        summary: techSummary
      },
      pricingModel: {
        tiers: pricing.tiers || [],
        hasFreeTier: pricing.hasFree || false,
        hasFreeTrial: pricing.hasFreeTrial || false,
        hasEnterprise: pricing.hasEnterprise || false,
        hasCustomPricing: pricing.hasCustomPricing || false,
        currency: pricing.currency || 'Unknown',
        billingPeriods: pricing.billingPeriods || [],
        summary: pricing.tiers?.length > 0
          ? `${pricing.tiers.length} pricing tiers detected`
          : 'Pricing information unavailable from verified sources'
      }
    },
    strategicAssessment: {
      marketPosition: market.tam !== 'Unknown' ? `Addressing a market with TAM of ${market.tam}` : 'Market size unknown - insufficient data from verified sources',
      growthRate: market.growthRate !== 'Unknown' ? `Market growing at ${market.growthRate}` : 'Market growth rate unknown - insufficient data',
      keyTrends: market.trends?.slice(0, 5) || ['Insufficient trend data from verified sources'],
      marketOpportunities: market.opportunities?.slice(0, 5) || ['Insufficient opportunity data from verified sources'],
      marketRisks: market.risks?.slice(0, 5) || ['Insufficient risk data from verified sources']
    },
    competitiveLandscape: {
      directCompetitors: (competitors.direct || []).map(c => ({
        name: c.name,
        domain: c.domain,
        similarityScore: c.similarityScore || null,
        evidence: c.evidence || 'Identified via SERP analysis',
        source: c.source || 'Unknown'
      })),
      indirectCompetitors: (competitors.indirect || []).map(c => ({
        name: c.name,
        domain: c.domain,
        source: c.source || 'Unknown'
      })),
      totalCompetitorsIdentified: (competitors.all || []).length,
      competitorDataQuality: competitors.all?.length > 3 ? 'Good - multiple verified sources' :
        competitors.all?.length > 0 ? 'Limited - single source' : 'Insufficient - no verified competitor data'
    },
    growthOpportunities: {
      marketExpansion: market.tam !== 'Unknown' ? `Total Addressable Market: ${market.tam}` : 'Market size data unavailable',
      technologyAdoption: technology.technologies?.length > 0
        ? `Technology stack analysis reveals ${technology.technologies.length} verified technologies`
        : 'Technology stack data insufficient for opportunity analysis',
      competitiveGaps: (competitors.direct || []).length > 0
        ? `${competitors.direct.length} direct competitors identified for gap analysis`
        : 'Insufficient competitor data for gap analysis',
      audienceInsights: audience.personas?.length > 0
        ? `${audience.personas.length} ideal customer profiles developed from industry evidence`
        : 'Insufficient audience data for persona development'
    },
    businessRisks: {
      competitivePressure: (competitors.direct || []).length > 3 ? 'High - Multiple direct competitors identified' :
        (competitors.direct || []).length > 0 ? 'Moderate - Some competitors present' : 'Unknown - Insufficient competitor data',
      dataQuality: evidenceWarnings.length > 5 ? 'High - Multiple data gaps in intelligence collection' :
        evidenceWarnings.length > 0 ? 'Moderate - Some data gaps present' : 'Low - Comprehensive data collection',
      marketVisibility: market.tam === 'Unknown' ? 'Unknown - Market size not verified' : 'Quantified - Market size data available'
    },
    recommendedInvestments: [
      {
        area: 'Competitive Intelligence',
        priority: competitors.all?.length === 0 ? 'Critical' : 'High',
        rationale: competitors.all?.length === 0
          ? 'No verified competitors identified. Competitive analysis requires SERP API integration.'
          : 'Continuous monitoring of identified competitors'
      },
      {
        area: 'Market Sizing',
        priority: market.tam === 'Unknown' ? 'Critical' : 'Medium',
        rationale: market.tam === 'Unknown'
          ? 'TAM/SAM/SOM data unavailable. Market sizing requires industry report integration.'
          : 'Refine market size estimates with verified industry reports'
      },
      {
        area: 'Technology Stack Analysis',
        priority: technology.technologies?.length === 0 ? 'Medium' : 'Low',
        rationale: technology.technologies?.length === 0
          ? 'Technology fingerprinting inconclusive'
          : 'Technology stack successfully identified'
      },
      {
        area: 'Pricing Intelligence',
        priority: pricing.tiers?.length === 0 ? 'Medium' : 'Low',
        rationale: pricing.tiers?.length === 0
          ? 'Pricing information not found on website'
          : 'Pricing model documented'
      }
    ],
    expectedOutcomes: {
      shortTerm: 'Enhanced competitive awareness and market positioning',
      mediumTerm: 'Data-driven strategic decisions based on verified intelligence',
      longTerm: 'Enterprise-grade market intelligence infrastructure',
      kpiRecommendations: [
        'Track competitor landscape changes monthly',
        'Validate market size estimates with industry reports',
        'Monitor technology stack evolution',
        'Update competitive matrix quarterly'
      ]
    },
    evidenceReferences: {
      totalSources: evidenceSources.length,
      sourcesByType: groupBy(evidenceSources, 'type'),
      dataLimitations: evidenceWarnings.slice(0, 5),
      confidence: evidenceSources.length > 5 ? 'High confidence in collected data' :
        evidenceSources.length > 0 ? 'Medium confidence - additional sources recommended' :
        'Low confidence - insufficient verified sources'
    }
  };
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}
