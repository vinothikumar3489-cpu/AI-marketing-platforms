export function generateActionPlan(intelligence) {
  const company = intelligence.companyIntelligence || {};
  const technology = intelligence.technologyIntelligence || {};
  const pricing = intelligence.pricingIntelligence || {};
  const competitors = intelligence.competitorIntelligence || {};
  const market = intelligence.marketIntelligence || {};
  const audience = intelligence.audienceIntelligence || {};

  const companyName = company.name || 'Unknown';
  const industry = company.industry || 'Unknown';
  const directCount = (competitors.direct || []).length;
  const hasPricing = (pricing.tiers || []).length > 0;
  const hasTech = (technology.technologies || []).length > 0;
  const hasMarket = market.tam !== 'Unknown';
  const personaCount = (audience.personas || []).length;
  const hasCompetitors = directCount > 0;

  const actionPlan = {
    day7: [],
    day30: [],
    day60: [],
    day90: [],
    day180: [],
    day365: []
  };

  // Day 7 actions
  if (!hasCompetitors || directCount < 3) {
    actionPlan.day7.push({
      title: 'Complete initial competitive landscape assessment',
      owner: 'Strategy Team',
      priority: 'Critical',
      dependencies: ['SERP API integration (DataForSEO or Tavily)'],
      estimatedROI: 'Foundation for all competitive intelligence',
      expectedKPI: 'Identify minimum 5 direct competitors',
      businessImpact: 'Enables competitive positioning and gap analysis',
      evidence: `Current intelligence identified ${directCount} direct competitors from ${(competitors.sources || []).map(s => s.source).join(', ') || 'no verified sources'}. Additional SERP research needed to expand competitive coverage.`
    });
  } else {
    actionPlan.day7.push({
      title: 'Validate and enrich identified competitor profiles',
      owner: 'Market Intelligence',
      priority: 'High',
      dependencies: ['Competitor list from intelligence engine'],
      estimatedROI: 'Improved competitive positioning accuracy',
      expectedKPI: 'Complete competitor profiles for top 5',
      businessImpact: 'Enables differentiated messaging and positioning',
      evidence: `${directCount} direct competitors identified via ${(competitors.sources || []).map(s => s.source).join(', ') || 'verified sources'}. Profiles require enrichment with pricing, features, and market data.`
    });
  }

  if (!hasPricing) {
    actionPlan.day7.push({
      title: 'Collect pricing intelligence from competitor websites',
      owner: 'Product Marketing',
      priority: 'High',
      dependencies: ['Competitor identification'],
      estimatedROI: 'Informed pricing strategy',
      expectedKPI: 'Pricing matrix for 5 competitors',
      businessImpact: 'Enables competitive pricing positioning',
      evidence: 'Pricing information not detected on company website. Competitor pricing research needed to establish market pricing benchmarks.'
    });
  } else {
    actionPlan.day7.push({
      title: 'Benchmark pricing against competitors',
      owner: 'Product Marketing',
      priority: 'Medium',
      dependencies: ['Internal pricing documented', 'Competitor pricing data'],
      estimatedROI: 'Optimized pricing strategy',
      expectedKPI: 'Pricing comparison report',
      businessImpact: 'Ensures competitive pricing positioning',
      evidence: `${pricing.tiers.length} pricing tiers detected. Comparison with competitor pricing needed to validate market positioning.`
    });
  }

  if (!hasTech) {
    actionPlan.day7.push({
      title: 'Run comprehensive technology stack analysis',
      owner: 'Engineering',
      priority: 'Medium',
      dependencies: ['Company website URL'],
      estimatedROI: 'Technology infrastructure visibility',
      expectedKPI: 'Technology stack inventory',
      businessImpact: 'Enables integration planning and technical positioning',
      evidence: 'Technology fingerprinting from website scraping was inconclusive. Manual analysis or Wappalyzer integration recommended.'
    });
  }

  // Day 30 actions
  if (!hasMarket) {
    actionPlan.day30.push({
      title: 'Commission market sizing report',
      owner: 'Strategy Team',
      priority: 'High',
      dependencies: ['Industry classification', 'Budget for industry reports'],
      estimatedROI: 'Quantified market opportunity',
      expectedKPI: 'Verified TAM/SAM/SOM estimates',
      businessImpact: 'Enables investor communication and strategic planning',
      evidence: 'Current market intelligence unable to verify TAM/SAM/SOM from available data sources. Industry report integration (Gartner, Forrester, IBISWorld) recommended.'
    });
  } else {
    actionPlan.day30.push({
      title: 'Validate market size estimates with industry reports',
      owner: 'Strategy Team',
      priority: 'Medium',
      dependencies: ['Initial market estimates from intelligence engine'],
      estimatedROI: 'Accurate market sizing for planning',
      expectedKPI: 'Cross-validated TAM/SAM/SOM',
      businessImpact: 'Confidence in market opportunity quantification',
      evidence: `Market intelligence collected from ${(market.sources || []).map(s => s.source).join(', ') || 'available sources'}. Cross-validation with published industry reports recommended.`
    });
  }

  if (personaCount < 2) {
    actionPlan.day30.push({
      title: 'Develop evidence-based buyer personas',
      owner: 'Marketing',
      priority: 'High',
      dependencies: ['Customer interview access', 'Market research budget'],
      estimatedROI: 'Improved targeting and messaging',
      expectedKPI: '3 validated buyer personas with ICP criteria',
      businessImpact: 'Enables targeted marketing and sales enablement',
      evidence: `${personaCount} personas developed from industry evidence patterns. Additional primary research needed to validate and enrich persona profiles.`
    });
  }

  actionPlan.day30.push({
    title: 'Establish competitive monitoring process',
    owner: 'Market Intelligence',
    priority: 'Medium',
    dependencies: ['Competitor identification complete', 'Monitoring tool selection'],
    estimatedROI: 'Continuous competitive awareness',
    expectedKPI: 'Weekly competitive intelligence reports',
    businessImpact: 'Early warning of competitive threats and opportunities',
    evidence: 'Regular monitoring required to track competitor positioning changes, product launches, and market moves.'
  });

  // Day 60 actions
  if (hasCompetitors) {
    actionPlan.day60.push({
      title: 'Build competitive feature comparison matrix',
      owner: 'Product Management',
      priority: 'High',
      dependencies: ['Competitor product research', 'Internal feature inventory'],
      estimatedROI: 'Product differentiation roadmap',
      expectedKPI: 'Feature parity/gap analysis document',
      businessImpact: 'Informs product roadmap and positioning',
      evidence: `${directCount} direct competitors identified. Feature-level comparison needed to identify differentiation opportunities and gaps.`
    });
  }

  actionPlan.day60.push({
    title: 'Develop industry-specific GTM strategy',
    owner: 'Marketing',
    priority: 'High',
    dependencies: ['Persona validation', 'Competitive analysis', 'Market sizing'],
    estimatedROI: 'Focused market entry and growth',
    expectedKPI: 'GTM plan with channel mix and budget allocation',
    businessImpact: 'Efficient customer acquisition and market penetration',
    evidence: intelligence.evidence?.sources?.length > 0
      ? `Strategy informed by ${intelligence.evidence.sources.length} verified intelligence sources`
      : 'Additional intelligence collection recommended before GTM planning'
  });

  // Day 90 actions
  actionPlan.day90.push({
    title: 'Launch targeted demand generation campaign',
    owner: 'Growth Team',
    priority: 'High',
    dependencies: ['GTM strategy complete', 'Creative assets ready', 'Channel selection finalized'],
    estimatedROI: '3-5x return on campaign investment',
    expectedKPI: '500+ qualified leads, 5%+ conversion rate',
    businessImpact: 'Revenue generation and market share growth',
    evidence: audience.channels?.length > 0
      ? `Channels identified: ${audience.channels.join(', ')}`
      : 'Channel selection requires audience research completion'
  });

  actionPlan.day90.push({
    title: 'Implement competitive intelligence dashboard',
    owner: 'Data Engineering',
    priority: 'Medium',
    dependencies: ['Monitoring process established', 'Data source integration'],
    estimatedROI: 'Automated competitive tracking',
    expectedKPI: 'Real-time competitive landscape dashboard',
    businessImpact: 'Continuous intelligence without manual effort',
    evidence: 'Automated data collection from SERP APIs and web scraping enables continuous competitive monitoring.'
  });

  // Day 180 actions
  actionPlan.day180.push({
    title: 'Conduct comprehensive market position review',
    owner: 'Executive Team',
    priority: 'Medium',
    dependencies: ['6 months of competitive data', 'Market performance metrics'],
    estimatedROI: 'Strategic course correction insights',
    expectedKPI: 'Updated strategic plan with evidence-based adjustments',
    businessImpact: 'Ensures continued market relevance and competitive positioning',
    evidence: 'Semi-annual strategic review informed by competitive intelligence and market data collection.'
  });

  actionPlan.day180.push({
    title: 'Develop partner ecosystem strategy',
    owner: 'Partnerships',
    priority: 'Medium',
    dependencies: ['Technology integrations identified', 'Market position established'],
    estimatedROI: 'Expanded market reach through partnerships',
    expectedKPI: '5+ technology or channel partnerships',
    businessImpact: 'Multiplied distribution and integration capabilities',
    evidence: technology.integrations?.length > 0
      ? `Integration ecosystem opportunity detected`
      : 'Partnership strategy requires technology stack analysis completion'
  });

  // Day 365 actions
  actionPlan.day365.push({
    title: 'Annual strategic planning and intelligence audit',
    owner: 'CEO / Strategy',
    priority: 'High',
    dependencies: ['Full year of intelligence data', 'Business performance metrics'],
    estimatedROI: 'Data-driven annual strategy',
    expectedKPI: 'Annual strategic plan with verified market intelligence',
    businessImpact: 'Ensures long-term competitive advantage and market leadership',
    evidence: 'Annual review incorporating 12 months of competitive, market, and technology intelligence data.'
  });

  actionPlan.day365.push({
    title: 'Enterprise intelligence infrastructure maturity assessment',
    owner: 'Data & Analytics',
    priority: 'Low',
    dependencies: ['Full year of intelligence operations'],
    estimatedROI: 'Optimized intelligence operations',
    expectedKPI: 'Intelligence maturity score and improvement roadmap',
    businessImpact: 'Continuous improvement of business intelligence capabilities',
    evidence: 'Assessment of data sources, collection methods, and intelligence quality over the past year.'
  });

  return actionPlan;
}
