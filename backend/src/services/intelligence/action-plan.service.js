export function generateActionPlan(intelligence) {
  const company = intelligence.companyIntelligence || {};
  const technology = intelligence.technologyIntelligence || {};
  const pricing = intelligence.pricingIntelligence || {};
  const competitors = intelligence.competitorIntelligence || {};
  const market = intelligence.marketIntelligence || {};
  const audience = intelligence.audienceIntelligence || {};
  const seo = intelligence.seoIntelligence || {};

  const companyName = company.name || 'Unknown';
  const industry = company.industry || 'Unknown';
  const directCount = (competitors.direct || []).length;
  const totalCompetitors = (competitors.all || []).length;
  const hasPricing = (pricing.tiers || []).length > 0;
  const hasTech = (technology.technologies || []).length > 0;
  const hasMarket = market.tam !== 'Unknown' && market.tam !== null;
  const personaCount = (audience.personas || []).length;
  const hasCompetitors = directCount > 0;
  const now = new Date().toISOString();

  // PART 16: SEO-specific evidence
  const seoScore = seo.scores?.seoScore ?? seo.scores?.overall ?? null;
  const keywordCount = seo.keywords?.length || 0;
  const seoCompetitorCount = seo.competitors?.length || 0;
  const hasSeoData = seoScore !== null || keywordCount > 0 || seoCompetitorCount > 0;

  const actionPlan = {
    day7: [],
    day30: [],
    day60: [],
    day90: [],
    day180: [],
    day365: []
  };

  // ============================================
  // DAY 7 ACTIONS - Foundation & Intelligence
  // ============================================

  if (!hasCompetitors || totalCompetitors < 3) {
    actionPlan.day7.push({
      title: 'Complete initial competitive landscape assessment',
      priority: 'Critical',
      roi: 'Foundation for all strategic decisions',
      impact: 'Enables competitive positioning and gap analysis',
      difficulty: 'Medium',
      dependencies: ['SERP API integration (DataForSEO or Tavily)'],
      timeline: '7 days',
      owner: 'Strategy Team',
      kpis: ['Identify minimum 5 direct competitors', 'Create initial competitor list with domain verification'],
      businessJustification: 'Without competitor intelligence, all strategic decisions are based on assumptions rather than evidence.',
      why: 'Current intelligence identified only ' + totalCompetitors + ' competitors. A minimum of 5 verified competitors is required for meaningful competitive analysis and strategic positioning.',
      evidence: { source: 'Intelligence gap analysis', confidence: 100, collectedAt: now }
    });
  } else {
    actionPlan.day7.push({
      title: 'Validate and enrich identified competitor profiles',
      priority: 'High',
      roi: 'Improved competitive positioning accuracy',
      impact: 'Enables differentiated messaging and positioning strategy',
      difficulty: 'Low',
      dependencies: ['Competitor list from intelligence engine'],
      timeline: '7 days',
      owner: 'Market Intelligence',
      kpis: ['Complete enterprise fields for top 5 competitors', 'Verify competitor URLs and descriptions'],
      businessJustification: 'Competitor profiles without pricing, funding, and technology data limit strategic insight depth.',
      why: directCount + ' direct competitors identified via ' + (competitors.sources || []).map(s => s.source).join(', ') + '. Profiles require enrichment with enterprise fields (pricing, funding, tech stack) for actionable intelligence.',
      evidence: { source: 'Competitor intelligence analysis', confidence: 85, collectedAt: now }
    });
  }

  if (!hasPricing) {
    actionPlan.day7.push({
      title: 'Collect pricing intelligence from competitor websites',
      priority: 'High',
      roi: 'Informed pricing strategy for competitive positioning',
      impact: 'Enables price optimization and packaging decisions',
      difficulty: 'Medium',
      dependencies: ['Competitor identification complete', 'List of top competitors'],
      timeline: '7 days',
      owner: 'Product Marketing',
      kpis: ['Pricing matrix for 5 competitors', 'Identify common pricing tiers and billing models'],
      businessJustification: 'Pricing is the most visible competitive differentiator. Missing competitor pricing data leaves the company at a strategic disadvantage.',
      why: 'Pricing information was not detected on the company website. Competitor pricing research is essential to establish market pricing benchmarks and inform the company\'s pricing strategy.',
      evidence: { source: 'Website pricing analysis', confidence: 95, collectedAt: now }
    });
  }

  if (!hasTech) {
    actionPlan.day7.push({
      title: 'Run comprehensive technology stack analysis',
      priority: 'Medium',
      roi: 'Technology infrastructure visibility for integration planning',
      impact: 'Enables integration strategy and technical partnership identification',
      difficulty: 'Low',
      dependencies: ['Company website URL', 'Browser extension or Wappalyzer tool'],
      timeline: '7 days',
      owner: 'Engineering',
      kpis: ['Complete technology stack inventory', 'Identify top 5 competitor tech stacks'],
      businessJustification: 'Technology decisions impact scalability, security, and integration capabilities.',
      why: 'Technology fingerprinting from website scraping was inconclusive. Manual analysis or automated tool (Wappalyzer) is recommended to identify the full technology stack for infrastructure planning.',
      evidence: { source: 'Technology fingerprinting results', confidence: 85, collectedAt: now }
    });
  }

  actionPlan.day7.push({
    title: 'Establish baseline analytics and tracking audit',
    priority: 'High',
    roi: 'Data-driven decision making foundation',
    impact: 'Enables accurate performance measurement and attribution',
    difficulty: 'Low',
    dependencies: ['Website access', 'Google Analytics or alternative tool'],
    timeline: '7 days',
    owner: 'Data & Analytics',
    kpis: ['Verify analytics implementation', 'Document current tracking setup'],
    businessJustification: 'Without verified analytics, all growth decisions lack measurement foundation.',
    why: 'Analytics infrastructure must be verified before any growth campaigns begin. Baseline metrics are required to measure the impact of all subsequent actions.',
    evidence: { source: 'Analytics audit requirement', confidence: 90, collectedAt: now }
  });

  // PART 16: SEO-specific actions based on evidence
  if (!hasSeoData) {
    actionPlan.day7.push({
      title: 'Run comprehensive SEO technical audit',
      priority: 'High',
      roi: 'Foundation for organic search visibility',
      impact: 'Identifies technical barriers to search engine crawling and indexing',
      difficulty: 'Medium',
      dependencies: ['Website URL', 'PageSpeed Insights or Lighthouse tool', 'Screaming Frog or similar crawler'],
      timeline: '7 days',
      owner: 'SEO / Technical Marketing',
      kpis: ['Technical audit report with priority fixes', 'Core Web Vitals baseline metrics', 'Crawlability assessment'],
      businessJustification: 'SEO technical barriers prevent organic search visibility regardless of content quality.',
      why: 'No SEO intelligence data available. A comprehensive technical audit (PageSpeed, Lighthouse, crawlability) is required to establish baseline SEO health and identify technical barriers.',
      evidence: { source: 'SEO intelligence gap analysis', confidence: 100, collectedAt: now }
    });
  } else if (seoScore !== null && seoScore < 50) {
    actionPlan.day7.push({
      title: 'Address critical SEO technical issues',
      priority: 'Critical',
      roi: 'Immediate improvement in organic search visibility',
      impact: 'Removes barriers preventing search engine indexing and ranking',
      difficulty: 'Medium',
      dependencies: ['SEO technical audit results', 'Development team availability'],
      timeline: '7 days',
      owner: 'SEO / Engineering',
      kpis: ['Fix all critical technical issues', 'Improve Core Web Vitals to passing threshold', 'Resolve crawlability errors'],
      businessJustification: 'SEO score below 50 indicates critical technical barriers preventing organic search visibility.',
      why: 'Current SEO score is ' + seoScore + '/100, indicating significant technical barriers. Critical issues (Core Web Vitals, crawlability, meta tags) must be addressed before content optimization can be effective.',
      evidence: { source: 'SEO technical audit', confidence: 95, collectedAt: now }
    });
  }

  if (hasSeoData && keywordCount > 0) {
    actionPlan.day30.push({
      title: 'Develop keyword targeting strategy based on evidence',
      priority: 'High',
      roi: 'Organic traffic growth through targeted content creation',
      impact: 'Content strategy aligned with search demand and competitive opportunity',
      difficulty: 'Medium',
      dependencies: ['Keyword intelligence data', 'Content team availability'],
      timeline: '30 days',
      owner: 'SEO / Content Marketing',
      kpis: ['Keyword targeting document with priority tiers', 'Content calendar aligned with keyword opportunities', 'Competitor keyword gap analysis'],
      businessJustification: 'Keyword-driven content strategy converts 3-5x better than generic content.',
      why: keywordCount + ' keywords identified from SEO intelligence. A structured keyword targeting strategy prioritizes high-opportunity keywords based on volume, difficulty, and competitive gaps.',
      evidence: { source: 'Keyword intelligence analysis', confidence: 85, collectedAt: now }
    });
  }

  if (hasSeoData && seoCompetitorCount > 0) {
    actionPlan.day60.push({
      title: 'Build SEO competitor gap analysis and content strategy',
      priority: 'High',
      roi: 'Organic market share growth through competitive content gaps',
      impact: 'Content strategy targeting competitor weaknesses and opportunity keywords',
      difficulty: 'Medium',
      dependencies: ['SEO competitor intelligence', 'Keyword targeting strategy', 'Content team'],
      timeline: '60 days',
      owner: 'SEO / Content Marketing',
      kpis: ['Competitor keyword gap document', 'Content opportunity prioritization matrix', 'Target content calendar'],
      businessJustification: 'Competitor gap analysis identifies high-opportunity keywords where competitors are weak.',
      why: seoCompetitorCount + ' SEO competitors identified. Systematic analysis of competitor keyword rankings and content gaps identifies opportunities to capture organic market share through targeted content creation.',
      evidence: { source: 'SEO competitor intelligence', confidence: 80, collectedAt: now }
    });
  }

  // ============================================
  // DAY 30 ACTIONS - Research & Validation
  // ============================================

  if (!hasMarket || market.tam === 'Unknown') {
    actionPlan.day30.push({
      title: 'Commission verified market sizing report',
      priority: 'High',
      roi: 'Quantified market opportunity for investor and strategic planning',
      impact: 'Provides TAM/SAM/SOM for investor decks and strategic planning',
      difficulty: 'High',
      dependencies: ['Industry classification', 'Budget for industry reports ($500-$5,000)'],
      timeline: '30 days',
      owner: 'Strategy Team',
      kpis: ['Verified TAM/SAM/SOM from 2+ independent sources', 'Industry growth rate (CAGR) validation'],
      businessJustification: 'Investors and board members require verified market sizing for funding and strategic decisions.',
      why: 'Current market intelligence could not verify market size from available data sources. Industry report integration (Gartner, Forrester, IBISWorld, Statista) is required for investor-grade market sizing.',
      evidence: { source: 'Market intelligence gap analysis', confidence: 100, collectedAt: now }
    });
  } else {
    actionPlan.day30.push({
      title: 'Validate market size estimates with secondary industry reports',
      priority: 'Medium',
      roi: 'Accurate market sizing for strategic planning confidence',
      impact: 'Cross-validated market opportunity for investor communication',
      difficulty: 'Medium',
      dependencies: ['Current market estimates from intelligence engine', 'Access to industry reports'],
      timeline: '30 days',
      owner: 'Strategy Team',
      kpis: ['Cross-validated TAM/SAM/SOM', 'Confidence rating for each estimate'],
      businessJustification: 'Single-source market estimates carry inherent risk. Multi-source validation is best practice.',
      why: 'Market intelligence collected from ' + (market.sources || []).map(s => s.source).join(', ') + '. Cross-validation with published industry reports (Gartner, Forrester, IBISWorld) is recommended to increase confidence.',
      evidence: { source: 'Market intelligence analysis', confidence: 75, collectedAt: now }
    });
  }

  if (personaCount < 2) {
    actionPlan.day30.push({
      title: 'Develop evidence-based buyer personas through primary research',
      priority: 'High',
      roi: 'Improved targeting accuracy and messaging relevance',
      impact: 'Enables targeted marketing, sales enablement, and product prioritization',
      difficulty: 'Medium',
      dependencies: ['Customer interview access (minimum 5 interviews)', 'Market research budget'],
      timeline: '30 days',
      owner: 'Marketing / Product',
      kpis: ['3 validated buyer personas with ICP criteria', 'Persona validation score from customer interviews'],
      businessJustification: 'Persona-driven marketing converts 2-5x better than generic targeting.',
      why: 'Only ' + personaCount + ' personas were developed from industry evidence patterns. Primary research through customer interviews and surveys is needed to validate and enrich persona profiles with real-world insights.',
      evidence: { source: 'Audience intelligence analysis', confidence: 90, collectedAt: now }
    });
  }

  actionPlan.day30.push({
    title: 'Establish competitive monitoring process and dashboard',
    priority: 'Medium',
    roi: 'Continuous competitive awareness without manual effort',
    impact: 'Early warning of competitive threats and market opportunities',
    difficulty: 'Medium',
    dependencies: ['Competitor identification complete', 'Monitoring tool selection (e.g., Crayon, Kompyte)'],
    timeline: '30 days',
    owner: 'Market Intelligence',
    kpis: ['Weekly competitive intelligence alerts', 'Monthly competitive landscape summary'],
    businessJustification: 'Markets change rapidly. Manual monitoring creates blind spots between review cycles.',
    why: 'Regular automated monitoring required to track competitor positioning changes, product launches, pricing updates, and market moves. Manual monitoring is unsustainable as the competitive landscape evolves.',
    evidence: { source: 'Best practice recommendation', confidence: 85, collectedAt: now }
  });

  actionPlan.day30.push({
    title: 'Develop messaging and positioning framework',
    priority: 'High',
    roi: 'Consistent brand voice across all channels',
    impact: 'Enables differentiated market positioning and sales enablement',
    difficulty: 'Medium',
    dependencies: ['Competitor analysis complete', 'Persona research initiated'],
    timeline: '30 days',
    owner: 'Marketing',
    kpis: ['Positioning statement', 'Messaging pillars', 'Value proposition document'],
    businessJustification: 'Inconsistent messaging reduces conversion rates by up to 30%.',
    why: 'A structured messaging framework ensures all marketing and sales communications are aligned with the company\'s competitive positioning strategy. This is a prerequisite for campaign development.',
    evidence: { source: 'Best practice recommendation', confidence: 80, collectedAt: now }
  });

  // ============================================
  // DAY 60 ACTIONS - Strategy & Planning
  // ============================================

  if (hasCompetitors) {
    actionPlan.day60.push({
      title: 'Build competitive feature comparison matrix',
      priority: 'High',
      roi: 'Product differentiation roadmap and feature prioritization',
      impact: 'Informs product roadmap, positioning, and sales enablement',
      difficulty: 'Medium',
      dependencies: ['Competitor product research', 'Internal feature inventory', 'Product team availability'],
      timeline: '60 days',
      owner: 'Product Management',
      kpis: ['Feature parity/gap analysis document', 'Prioritized differentiation opportunity list'],
      businessJustification: 'Feature-level competitor analysis is the foundation for product differentiation strategy.',
      why: directCount + ' direct competitors identified. A systematic feature-level comparison is needed to identify differentiation opportunities, feature gaps, and prioritize the product roadmap for competitive advantage.',
      evidence: { source: 'Competitor intelligence analysis', confidence: 85, collectedAt: now }
    });
  }

  actionPlan.day60.push({
    title: 'Develop industry-specific go-to-market strategy',
    priority: 'High',
    roi: 'Focused market entry and efficient customer acquisition',
    impact: 'GTM plan with channel mix, budget allocation, and timeline',
    difficulty: 'High',
    dependencies: ['Persona validation complete', 'Competitive analysis complete', 'Market sizing complete'],
    timeline: '60 days',
    owner: 'Marketing / Growth',
    kpis: ['GTM strategy document', 'Channel mix with budget allocation', '30-60-90 day execution plan'],
    businessJustification: 'Companies with documented GTM strategies grow 2x faster than those without.',
    why: 'A comprehensive GTM strategy synthesizes all intelligence inputs (competitive, market, audience) into a coordinated execution plan. Without it, growth efforts lack focus and measurable objectives.',
    evidence: { source: intelligence.evidence?.sources?.length > 0 ? intelligence.evidence.sources.length + ' verified intelligence sources' : 'Intelligence collection in progress', confidence: 70, collectedAt: now }
  });

  actionPlan.day60.push({
    title: 'Implement technology integrations and partnerships roadmap',
    priority: 'Medium',
    roi: 'Expanded market reach through ecosystem integration',
    impact: 'Multiplied distribution and enhanced product value through integrations',
    difficulty: 'High',
    dependencies: ['Technology stack analysis', 'API capabilities assessment', 'Partner identification'],
    timeline: '60 days',
    owner: 'Engineering / Partnerships',
    kpis: ['Integration priority matrix', 'Top 3 partner integration targets identified'],
    businessJustification: 'Platform companies with 10+ integrations grow 3x faster than those with fewer.',
    why: 'Integration with complementary tools and platforms expands the addressable market and reduces customer acquisition costs through partner channels.',
    evidence: { source: 'Technology stack analysis', confidence: technology.technologies?.length > 0 ? 80 : 50, collectedAt: now }
  });

  // ============================================
  // DAY 90 ACTIONS - Execution & Growth
  // ============================================

  actionPlan.day90.push({
    title: 'Launch targeted demand generation campaign',
    priority: 'High',
    roi: '3-5x return on campaign investment',
    impact: 'Revenue generation and market share growth',
    difficulty: 'Medium',
    dependencies: ['GTM strategy complete', 'Creative assets ready', 'Channel selection finalized', 'Tracking infrastructure verified'],
    timeline: '90 days',
    owner: 'Growth Team',
    kpis: ['500+ qualified leads or equivalent metric', '5%+ conversion rate on target actions', 'CPA within target range'],
    businessJustification: 'Demand generation is the primary revenue engine for growth-stage companies.',
    why: audience.channels?.length > 0
      ? 'Channels identified: ' + audience.channels.map(c => c.name || c).join(', ') + '. A coordinated multi-channel demand generation campaign will test GTM assumptions and generate early revenue.'
      : 'Channel selection requires audience research completion. Campaign will focus on highest-confidence channels identified to date.',
    evidence: { source: 'Audience and channel intelligence', confidence: audience.channels?.length > 0 ? 75 : 50, collectedAt: now }
  });

  actionPlan.day90.push({
    title: 'Implement competitive intelligence dashboard',
    priority: 'Medium',
    roi: 'Automated competitive tracking reducing manual effort by 80%',
    impact: 'Real-time competitive landscape visibility for executive team',
    difficulty: 'Medium',
    dependencies: ['Monitoring process established', 'Data source integration (SERP APIs, web scraping)'],
    timeline: '90 days',
    owner: 'Data Engineering',
    kpis: ['Real-time competitive positioning dashboard', 'Automated weekly competitor alerts'],
    businessJustification: 'Manual competitive monitoring is not scalable and creates blind spots.',
    why: 'Automated data collection from SERP APIs and web scraping enables continuous competitive monitoring without manual effort, providing early warning of market changes.',
    evidence: { source: 'Technology capability assessment', confidence: 75, collectedAt: now }
  });

  actionPlan.day90.push({
    title: 'Conduct pricing strategy review and optimization',
    priority: 'Medium',
    roi: '5-15% revenue uplift through pricing optimization',
    impact: 'Direct revenue impact through optimized pricing and packaging',
    difficulty: 'Medium',
    dependencies: ['Competitor pricing matrix', 'Customer willingness-to-pay data', 'Feature comparison analysis'],
    timeline: '90 days',
    owner: 'Product Marketing / Finance',
    kpis: ['Pricing optimization recommendations', 'Price elasticity analysis'],
    businessJustification: 'Pricing optimization is the highest-leverage revenue activity for most SaaS companies.',
    why: hasPricing
      ? 'Current pricing model has ' + pricing.tiers.length + ' tiers. A systematic pricing review informed by competitor analysis and customer research can identify opportunities for revenue optimization.'
      : 'Pricing strategy has not been documented. A comprehensive pricing review is needed to establish a competitive and revenue-optimized pricing model.',
    evidence: { source: 'Pricing intelligence analysis', confidence: hasPricing ? 80 : 60, collectedAt: now }
  });

  // ============================================
  // DAY 180 ACTIONS - Optimization & Scale
  // ============================================

  actionPlan.day180.push({
    title: 'Conduct comprehensive market position review',
    priority: 'Medium',
    roi: 'Strategic course correction insights preventing market share loss',
    impact: 'Ensures continued market relevance and competitive positioning',
    difficulty: 'Medium',
    dependencies: ['6 months of competitive data', 'Revenue and growth metrics', 'Customer feedback analysis'],
    timeline: '180 days',
    owner: 'Executive Team',
    kpis: ['Updated strategic plan with evidence-based adjustments', 'Market position vs. 6 months ago assessment'],
    businessJustification: 'Semi-annual strategic reviews prevent drift and ensure continued market alignment.',
    why: 'Six months of competitive intelligence, market data, and performance metrics provide a rich dataset for strategic review. This is the minimum timeframe for meaningful trend analysis.',
    evidence: { source: 'Strategic planning best practice', confidence: 80, collectedAt: now }
  });

  actionPlan.day180.push({
    title: 'Develop and launch partner ecosystem program',
    priority: 'Medium',
    roi: 'Expanded market reach 3-5x through channel partners',
    impact: 'Multiplied distribution and enhanced product value through ecosystem',
    difficulty: 'High',
    dependencies: ['Technology integrations identified and built', 'Market position validated', 'Partner program design'],
    timeline: '180 days',
    owner: 'Partnerships / Channel Sales',
    kpis: ['5+ technology or channel partnerships signed', 'Partner-sourced revenue pipeline established'],
    businessJustification: 'Partner ecosystems can account for 30-50% of revenue for mature SaaS companies.',
    why: technology.integrations?.length > 0
      ? 'Integration ecosystem opportunity detected. A structured partner program accelerates distribution and creates defensible market positioning.'
      : 'Partnership strategy requires technology stack analysis completion. Initial focus should be on integration partnerships with complementary tools.',
    evidence: { source: 'Technology and market analysis', confidence: 65, collectedAt: now }
  });

  actionPlan.day180.push({
    title: 'Optimize marketing channel mix based on 6-month performance data',
    priority: 'Medium',
    roi: '20-40% improvement in marketing ROI through channel optimization',
    impact: 'Efficient marketing spend allocation and improved unit economics',
    difficulty: 'Medium',
    dependencies: ['6 months of campaign performance data', 'Attribution model in place'],
    timeline: '180 days',
    owner: 'Marketing / Growth',
    kpis: ['Channel CAC analysis', 'ROI by channel report', 'Optimized budget allocation plan'],
    businessJustification: 'Marketing efficiency improves significantly when data-driven channel optimization is applied.',
    why: 'Six months of campaign data provides statistically significant sample sizes for channel performance analysis, enabling data-driven budget reallocation to highest-performing channels.',
    evidence: { source: 'Performance marketing best practice', confidence: 75, collectedAt: now }
  });

  // ============================================
  // DAY 365 ACTIONS - Maturity & Leadership
  // ============================================

  actionPlan.day365.push({
    title: 'Annual strategic planning and intelligence audit',
    priority: 'High',
    roi: 'Data-driven annual strategy with verified market intelligence',
    impact: 'Ensures long-term competitive advantage and market leadership trajectory',
    difficulty: 'High',
    dependencies: ['Full year of intelligence data', 'Business performance metrics', 'Board and executive alignment'],
    timeline: '365 days',
    owner: 'CEO / Strategy',
    kpis: ['Annual strategic plan with verified market intelligence', 'Year-over-year competitive position assessment'],
    businessJustification: 'Annual strategic planning with verified intelligence is a board-level expectation for enterprise companies.',
    why: 'A full year of competitive, market, and technology intelligence data enables comprehensive strategic planning. This annual review establishes the strategic direction for the next 12 months based on evidence rather than intuition.',
    evidence: { source: 'Annual planning cycle best practice', confidence: 85, collectedAt: now }
  });

  actionPlan.day365.push({
    title: 'Enterprise intelligence infrastructure maturity assessment',
    priority: 'Medium',
    roi: 'Optimized intelligence operations and reduced manual effort',
    impact: 'Continuous improvement of business intelligence capabilities',
    difficulty: 'Medium',
    dependencies: ['Full year of intelligence operations', 'Data quality metrics', 'Team capability assessment'],
    timeline: '365 days',
    owner: 'Data & Analytics',
    kpis: ['Intelligence maturity score', 'Improvement roadmap for next 12 months'],
    businessJustification: 'Intelligence infrastructure maturity directly correlates with strategic decision quality.',
    why: 'Assessment of data sources, collection methods, and intelligence quality over the past year identifies gaps and opportunities for improving the business intelligence infrastructure.',
    evidence: { source: 'Intelligence operations review', confidence: 80, collectedAt: now }
  });

  actionPlan.day365.push({
    title: 'Build predictive market intelligence models',
    priority: 'Low',
    roi: 'Predictive insights for proactive rather than reactive strategy',
    impact: 'First-mover advantage through trend prediction',
    difficulty: 'High',
    dependencies: ['12 months of historical data', 'Data science team or ML capability', 'Clean, structured dataset'],
    timeline: '365 days',
    owner: 'Data Science / Advanced Analytics',
    kpis: ['Predictive model accuracy score', 'Number of actionable predictions generated'],
    businessJustification: 'Leading enterprises use predictive intelligence for proactive strategy formulation.',
    why: 'With a full year of structured intelligence data, machine learning models can be trained to predict market trends, competitor moves, and customer behavior changes, enabling proactive rather than reactive strategy.',
    evidence: { source: 'Advanced analytics capability assessment', confidence: 50, collectedAt: now }
  });

  return actionPlan;
}
