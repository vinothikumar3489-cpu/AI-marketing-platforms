export function generateExecutiveStory(intelligence) {
  const company = intelligence.companyIntelligence || {};
  const technology = intelligence.technologyIntelligence || {};
  const pricing = intelligence.pricingIntelligence || {};
  const competitors = intelligence.competitorIntelligence || {};
  const market = intelligence.marketIntelligence || {};
  const audience = intelligence.audienceIntelligence || {};

  const companyName = company.name || 'Unknown';
  const industry = company.industry || 'Unknown';
  const evidence = intelligence.evidence || {};
  const evidenceSources = evidence.sources || [];
  const evidenceWarnings = evidence.warnings || [];

  const confidenceLevel = evidenceSources.length > 5 ? 'High' : evidenceSources.length > 0 ? 'Medium' : 'Low';

  const allCompetitors = (competitors.direct || []).concat(competitors.indirect || []);
  const directCompetitorNames = (competitors.direct || []).map(c => c.name).join(', ') || 'Unknown';
  const personifyCount = (audience.personas || []).length;

  return {
    executiveSummary: {
      title: `Enterprise Business Intelligence Report: ${companyName}`,
      company: companyName,
      industry,
      assessmentDate: new Date().toISOString().split('T')[0],
      methodology: 'Enterprise-grade market intelligence collected from verified sources including DataForSEO SERP data, Tavily research, web scraping, technology fingerprinting, and page speed analysis.',
      confidenceLevel,
      evidenceSourcesUsed: evidenceSources.length,
      dataGaps: evidenceWarnings.length,
      reportType: 'Enterprise Business Intelligence 2.0',
      version: '2.0.0'
    },
    companyOverview: {
      name: companyName,
      domain: company.domain || 'Unknown',
      industry,
      category: company.category || 'Unknown',
      subCategory: company.subCategory || 'Unknown',
      headquarters: company.headquarters || 'Unknown',
      launchYear: company.launchYear || 'Unknown',
      employeeEstimate: company.employeeEstimate || 'Unknown',
      languages: company.languages || ['Unknown'],
      supportedCountries: company.supportedCountries || ['Unknown'],
      socialChannels: company.socialChannels || [],
      evidence: {
        source: evidenceSources.length > 0 ? 'Web scraping & SERP analysis' : 'Unknown',
        confidence: evidenceSources.length > 0 ? 85 : 0,
        collectedAt: new Date().toISOString()
      }
    },
    businessModel: {
      type: company.businessModel || 'Unknown',
      b2bOrB2C: company.b2bOrB2C || 'Unknown',
      targetMarket: company.targetMarket || 'Unknown',
      openSourceOrSaaS: company.openSourceOrSaaS || 'Unknown',
      freeTrial: company.freeTrial || false,
      enterprisePlan: company.enterprisePlan || false,
      evidence: {
        source: company.businessModel !== 'Unknown' ? 'Website content analysis' : 'Unknown',
        confidence: company.businessModel !== 'Unknown' ? 90 : 0,
        collectedAt: new Date().toISOString()
      }
    },
    revenueModel: {
      pricingTiers: pricing.tiers || [],
      hasFreeTier: pricing.hasFree || false,
      hasFreeTrial: pricing.hasTrial || false,
      hasEnterprise: pricing.hasEnterprise || false,
      hasCustomPricing: pricing.hasCustomPricing || false,
      currency: pricing.currency || 'Unknown',
      billingPeriods: pricing.billingPeriods || [],
      pricePoints: pricing.pricePoints || [],
      estimatedARR: 'Unknown',
      evidence: {
        source: pricing.tiers?.length > 0 ? 'Website pricing page analysis' : 'Not found on website',
        confidence: pricing.tiers?.length > 0 ? 85 : 0,
        collectedAt: new Date().toISOString()
      }
    },
    growthStage: {
      fundingStage: company.fundingStage || 'Unknown',
      fundingAmount: company.fundingAmount || 'Unknown',
      growthPhase: inferGrowthPhase(company, competitors),
      employeeGrowth: company.employeeEstimate !== 'Unknown' ? `${company.employeeEstimate} employees` : 'Unknown',
      evidence: {
        source: company.fundingStage !== 'Unknown' ? 'SERP & market analysis' : 'Unknown',
        confidence: company.fundingStage !== 'Unknown' ? 70 : 0,
        collectedAt: new Date().toISOString()
      }
    },
    productMaturity: {
      stage: inferProductMaturity(company, competitors),
      technologyCount: (technology.technologies || []).length,
      hasAPI: (technology.technologies || []).some(t => t.category === 'framework' || t.category === 'backend'),
      integrationsDetected: company.integrations?.length > 0 || false,
      evidence: {
        source: technology.technologies?.length > 0 ? 'Technology stack fingerprinting' : 'Unknown',
        confidence: technology.technologies?.length > 0 ? 80 : 0,
        collectedAt: new Date().toISOString()
      }
    },
    marketPosition: {
      tam: market.tam ?? 'Unknown',
      sam: market.sam ?? 'Unknown',
      som: market.som ?? 'Unknown',
      growthRate: market.growthRate ?? 'Unknown',
      competitiveIntensity: allCompetitors.length > 5 ? 'High' : allCompetitors.length > 2 ? 'Medium' : 'Low',
      directCompetitors: (competitors.direct || []).length,
      indirectCompetitors: (competitors.indirect || []).length,
      totalCompetitorsIdentified: allCompetitors.length,
      evidence: {
        source: market.tam !== 'Unknown' ? 'DataForSEO & Tavily market analysis' : 'Unknown',
        confidence: market.tam !== 'Unknown' ? 75 : 0,
        collectedAt: new Date().toISOString()
      }
    },
    swot: {
      strengths: generateStrengths(company, technology, pricing),
      weaknesses: generateWeaknesses(company, technology, pricing, evidenceWarnings),
      opportunities: generateOpportunities(market, competitors, audience),
      threats: generateThreats(competitors, market, evidenceWarnings),
      evidence: {
        source: 'Synthesized from all intelligence sources',
        confidence: evidenceSources.length > 3 ? 75 : 50,
        collectedAt: new Date().toISOString()
      }
    },
    keyFindings: generateKeyFindings(company, competitors, market, technology, audience, pricing, evidenceWarnings),
    topPriorities: generateTopPriorities(company, competitors, market, technology, audience, pricing),
    executiveRecommendation: generateExecutiveRecommendation({
      company,
      competitors,
      market,
      technology,
      audience,
      pricing,
      confidenceLevel,
      evidenceSources
    })
  };
}

function inferGrowthPhase(company, competitors) {
  if (company.fundingStage && company.fundingStage !== 'Unknown') {
    const stage = company.fundingStage.toLowerCase();
    if (stage.includes('seed') || stage.includes('pre-seed')) return 'Early Stage (Seed)';
    if (stage.includes('series a') || stage.includes('series b')) return 'Growth Stage';
    if (stage.includes('series c') || stage.includes('series d') || stage.includes('late')) return 'Expansion Stage';
    if (stage.includes('public') || stage.includes('acquired') || stage.includes('profit')) return 'Mature';
  }
  if (company.employeeEstimate !== 'Unknown') {
    const emp = parseInt(company.employeeEstimate);
    if (!isNaN(emp)) {
      if (emp < 10) return 'Early Stage';
      if (emp < 50) return 'Growth Stage';
      if (emp < 200) return 'Expansion Stage';
      return 'Mature';
    }
  }
  return 'Unknown - Insufficient evidence';
}

function inferProductMaturity(company, competitors) {
  const techCount = (competitors.direct || []).length;
  if (company.launchYear !== 'Unknown') {
    const launchYear = parseInt(company.launchYear);
    const currentYear = new Date().getFullYear();
    if (!isNaN(launchYear)) {
      const age = currentYear - launchYear;
      if (age < 2) return 'Introduction / Early Stage';
      if (age < 5) return 'Growth';
      if (age < 10) return 'Mature';
      return 'Established / Market Leader';
    }
  }
  if (techCount > 5) return 'Competitive / Growth';
  if (techCount > 0) return 'Emerging';
  return 'Unknown - Insufficient evidence';
}

function generateStrengths(company, technology, pricing) {
  const strengths = [];
  if (company.employeeEstimate !== 'Unknown' && parseInt(company.employeeEstimate) > 20) {
    strengths.push({ value: `Established team of ${company.employeeEstimate} employees indicating operational capacity`, confidence: null, impact: 'High' });
  }
  if (technology.technologies?.length > 5) {
    strengths.push({ value: `Sophisticated technology stack with ${technology.technologies.length} verified technologies`, confidence: null, impact: 'High' });
  }
  if (pricing.tiers?.length > 0) {
    strengths.push({ value: `Clear pricing model with ${pricing.tiers.length} tiers enabling customer segmentation`, confidence: null, impact: 'Medium' });
  }
  if (pricing.hasFree || pricing.hasTrial) {
    strengths.push({ value: 'Free tier or trial available reducing barrier to entry', confidence: null, impact: 'High' });
  }
  if (company.socialChannels?.length > 2) {
    strengths.push({ value: `Active presence on ${company.socialChannels.length}+ social channels`, confidence: null, impact: 'Medium' });
  }
  if (strengths.length === 0) {
    strengths.push({ value: 'Insufficient evidence to determine strengths', confidence: 0, impact: 'Low' });
  }
  return strengths;
}

function generateWeaknesses(company, technology, pricing, warnings) {
  const weaknesses = [];
  if (pricing.tiers?.length === 0 && !pricing.hasFree && !pricing.hasTrial) {
    weaknesses.push({ value: 'Pricing information not publicly available on website', confidence: null, impact: 'High' });
  }
  if (technology.technologies?.length === 0) {
    weaknesses.push({ value: 'Technology stack could not be identified from public sources', confidence: null, impact: 'Medium' });
  }
  if (company.employeeEstimate === 'Unknown') {
    weaknesses.push({ value: 'Company size could not be verified from public data', confidence: null, impact: 'Medium' });
  }
  if (company.fundingStage === 'Unknown') {
    weaknesses.push({ value: 'Funding status could not be verified from public sources', confidence: null, impact: 'Low' });
  }
  if (warnings?.length > 0) {
    weaknesses.push({ value: `${warnings.length} data quality warnings during intelligence collection`, confidence: null, impact: 'Medium' });
  }
  if (weaknesses.length === 0) {
    weaknesses.push({ value: 'Insufficient evidence to determine weaknesses', confidence: 0, impact: 'Low' });
  }
  return weaknesses;
}

function generateOpportunities(market, competitors, audience) {
  const opportunities = [];
  if (market.trends?.length > 0) {
    const topTrends = market.trends.slice(0, 3);
    topTrends.forEach(t => {
      const text = typeof t === 'string' ? t : t.keyword || t.signal || '';
      if (text) {
        opportunities.push({ value: `Market trend: ${text}`, confidence: null, impact: 'High' });
      }
    });
  }
  if (market.opportunities?.length > 0) {
    market.opportunities.slice(0, 3).forEach(o => {
      opportunities.push({ value: typeof o === 'string' ? o : o.value || o, confidence: null, impact: 'High' });
    });
  }
  if ((competitors.direct || []).length === 0) {
    opportunities.push({ value: 'Potential first-mover advantage in identified market space', confidence: null, impact: 'High' });
  }
  if (opportunities.length === 0) {
    opportunities.push({ value: 'Insufficient evidence to determine opportunities', confidence: 0, impact: 'Low' });
  }
  return opportunities;
}

function generateThreats(competitors, market, warnings) {
  const threats = [];
  if ((competitors.direct || []).length > 3) {
    threats.push({ value: `High competitive intensity with ${competitors.direct.length} direct competitors`, confidence: null, impact: 'High' });
  }
  if (market.risks?.length > 0) {
    market.risks.slice(0, 3).forEach(r => {
      threats.push({ value: typeof r === 'string' ? r : r.value || r, confidence: null, impact: 'High' });
    });
  }
  if (warnings?.length > 3) {
    threats.push({ value: 'Data quality gaps may indicate opaque market positioning', confidence: null, impact: 'Medium' });
  }
  if (threats.length === 0) {
    threats.push({ value: 'Insufficient evidence to determine threats', confidence: 0, impact: 'Low' });
  }
  return threats;
}

function generateKeyFindings(company, competitors, market, technology, audience, pricing, warnings) {
  const findings = [];
  const directCount = (competitors.direct || []).length;
  const indirectCount = (competitors.indirect || []).length;
  const totalCompetitors = directCount + indirectCount;

  if (company.name !== 'Unknown') {
    findings.push({
      finding: `${company.name} operates in the ${company.industry || 'Unknown'} industry with a ${company.businessModel || 'Unknown'} business model.`,
      confidence: company.industry !== 'Unknown' ? 85 : 50,
      evidence: 'Website content analysis and SERP data',
      impact: 'High'
    });
  }

  findings.push({
    finding: totalCompetitors > 0
      ? `Identified ${directCount} direct and ${indirectCount} indirect competitors in the market space.`
      : 'No verified competitors identified from available data sources.',
    confidence: totalCompetitors > 0 ? 80 : 0,
    evidence: totalCompetitors > 0 ? 'DataForSEO SERP and Tavily research' : 'Unknown',
    impact: totalCompetitors > 0 ? 'High' : 'Medium'
  });

  findings.push({
    finding: market.tam !== 'Unknown'
      ? `Total Addressable Market estimated at ${market.tam} with growth rate of ${market.growthRate || 'Unknown'}.`
      : 'Market size (TAM/SAM/SOM) could not be verified from available data sources.',
    confidence: market.tam !== 'Unknown' ? 75 : 0,
    evidence: market.tam !== 'Unknown' ? 'DataForSEO keyword data and Tavily market signals' : 'Unknown',
    impact: 'High'
  });

  if (technology.technologies?.length > 0) {
    findings.push({
      finding: `Technology stack includes ${technology.technologies.length} verified technologies across framework, analytics, and infrastructure categories.`,
      confidence: null,
      evidence: 'Technology fingerprinting from website source code analysis',
      impact: 'Medium'
    });
  }

  if (audience.personas?.length > 0) {
    findings.push({
      finding: `Developed ${audience.personas.length} ideal customer profiles based on industry patterns and website evidence.`,
      confidence: null,
      evidence: 'Industry evidence patterns and website content analysis',
      impact: 'High'
    });
  }

  if (warnings?.length > 0) {
    findings.push({
      finding: `${warnings.length} data quality warnings were identified during intelligence collection.`,
      confidence: null,
      evidence: 'Intelligence collection process logs',
      impact: 'Medium'
    });
  }

  return findings;
}

function generateTopPriorities(company, competitors, market, technology, audience, pricing) {
  const priorities = [];
  const directCount = (competitors.direct || []).length;
  const totalCompetitors = directCount + (competitors.indirect || []).length;

  if (totalCompetitors === 0) {
    priorities.push({
      priority: 1,
      action: 'Establish competitive intelligence foundation',
      rationale: 'No competitors identified. Conduct primary market research to identify and profile competitors.',
      roi: 'Critical foundation for all strategic decisions',
      timeline: 'Immediate (0-30 days)',
      owner: 'Strategy Team',
      kpi: 'Identify minimum 5 direct and indirect competitors',
      evidence: `Current intelligence identified ${totalCompetitors} competitors. SERP analysis and market research required.`,
      confidence: null
    });
  } else {
    priorities.push({
      priority: 1,
      action: 'Deepen competitive analysis with feature-level comparison',
      rationale: `${directCount} direct competitors identified. Feature-level comparison needed to identify differentiation opportunities.`,
      roi: 'Informs product roadmap and positioning strategy',
      timeline: '30-60 days',
      owner: 'Product Management',
      kpi: 'Complete feature comparison matrix for top 5 competitors',
      evidence: `${directCount} direct competitors identified via ${(competitors.sources || []).map(s => s.source).join(', ') || 'available sources'}.`,
      confidence: null
    });
  }

  if (market.tam === 'Unknown' || market.tam === null) {
    priorities.push({
      priority: 2,
      action: 'Commission verified market sizing report',
      rationale: 'TAM/SAM/SOM not available from current data sources. Industry report integration required.',
      roi: 'Quantified market opportunity for investor and strategic planning',
      timeline: '30-60 days',
      owner: 'Strategy Team',
      kpi: 'Verified TAM/SAM/SOM with source attribution',
      evidence: 'Current market intelligence unable to verify market size from available data sources.',
      confidence: null
    });
  } else {
    priorities.push({
      priority: 2,
      action: 'Validate and refine market size estimates',
      rationale: `TAM of ${market.tam} identified. Cross-validate with industry reports for investor-grade accuracy.`,
      roi: 'Investor confidence and accurate market planning',
      timeline: '30-60 days',
      owner: 'Strategy Team',
      kpi: 'Cross-validated TAM/SAM/SOM from 2+ independent sources',
      evidence: `Market intelligence from ${(market.sources || []).length} sources.`,
      confidence: null
    });
  }

  if ((audience.personas || []).length < 2) {
    priorities.push({
      priority: 3,
      action: 'Develop evidence-based buyer personas',
      rationale: 'Insufficient persona data for targeted marketing. Primary research required.',
      roi: 'Improved targeting, messaging, and conversion rates',
      timeline: '30-60 days',
      owner: 'Marketing',
      kpi: '3 validated buyer personas with ICP criteria',
      evidence: `${(audience.personas || []).length} personas developed from industry patterns.`,
      confidence: null
    });
  }

  priorities.push({
    priority: 4,
    action: 'Define and implement GTM strategy',
    rationale: 'Channel and messaging strategy needed based on competitive and audience intelligence.',
    roi: 'Efficient customer acquisition and market penetration',
    timeline: '60-90 days',
    owner: 'Marketing / Growth',
    kpi: 'GTM plan with channel mix, budget allocation, and messaging framework',
      evidence: 'Synthesized from competitive, market, and audience intelligence.',
      confidence: null
  });

  priorities.push({
    priority: 5,
    action: 'Establish continuous intelligence monitoring',
    rationale: 'Markets and competitors evolve. Ongoing intelligence collection required for sustained advantage.',
    roi: 'Early warning of competitive threats and market opportunities',
    timeline: '90-180 days',
    owner: 'Data & Analytics',
    kpi: 'Automated competitive monitoring dashboard with weekly updates',
      evidence: 'Intelligence infrastructure requires automation for scalability.',
      confidence: null
  });

  return priorities;
}

function generateExecutiveRecommendation({
  company,
  competitors,
  market,
  technology,
  audience,
  pricing,
  confidenceLevel,
  evidenceSources = []
}) {
  const directCount = (competitors.direct || []).length;
  const hasMarket = market.tam !== 'Unknown' && market.tam !== null;
  const hasPersonas = (audience.personas || []).length > 0;
  const hasTech = (technology.technologies || []).length > 0;

  let recommendation = 'Based on the current intelligence assessment';

  if (confidenceLevel === 'Low') {
    recommendation += ', data quality is insufficient for a definitive recommendation. The primary objective should be to establish a verified intelligence foundation through SERP API integration, market research, and competitive analysis before making strategic decisions.';
  } else if (confidenceLevel === 'Medium') {
    recommendation += `, ${company.name || 'the company'} should prioritize competitive differentiation and market validation.`;
    if (directCount > 3) {
      recommendation += ` With ${directCount} direct competitors identified, differentiation strategy is critical.`;
    }
    if (!hasMarket) {
      recommendation += ' Market sizing requires external validation through industry reports.';
    }
    if (!hasPersonas) {
      recommendation += ' Buyer persona development through primary research is recommended to enable targeted marketing.';
    }
  } else {
    recommendation += `, ${company.name || 'the company'} is well-positioned with verified intelligence across multiple dimensions.`;
    if (directCount > 0) {
      recommendation += ` The competitive landscape includes ${directCount} direct competitors, suggesting a structured differentiation strategy should be maintained.`;
    }
    if (hasMarket) {
      recommendation += ` The addressable market (TAM: ${market.tam}) provides sufficient headroom for growth.`;
    }
    if (hasTech) {
      recommendation += ' The technology stack is well-defined and can support scaling efforts.';
    }
  }

  return {
    recommendation,
    confidenceLevel,
    basedOn: evidenceSummary(evidenceSources),
    nextSteps: [
      hasMarket ? 'Validate market size with secondary sources' : 'Commission market sizing report',
      directCount > 0 ? 'Build competitive feature matrix' : 'Identify and profile competitors',
      hasPersonas ? 'Activate targeted campaigns based on personas' : 'Develop buyer personas',
      'Establish quarterly intelligence review cycle',
    ],
    evidence: {
      source: 'Synthesized from all intelligence modules',
      confidence: confidenceLevel === 'High' ? 85 : confidenceLevel === 'Medium' ? 65 : 40,
      collectedAt: new Date().toISOString()
    }
  };
}

function evidenceSummary(sources) {
  if (!sources || sources.length === 0) return 'No verified evidence sources';
  const byType = {};
  sources.forEach(s => {
    const type = s.type || 'unknown';
    byType[type] = (byType[type] || 0) + 1;
  });
  return Object.entries(byType).map(([type, count]) => `${count}x ${type}`).join(', ');
}

function groupBy(arr, key) {
  return arr.reduce((acc, item) => {
    const k = item[key] || 'other';
    acc[k] = (acc[k] || 0) + 1;
    return acc;
  }, {});
}
