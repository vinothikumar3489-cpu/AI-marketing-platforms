// ============================================
// FALLBACK GENERATORS - PRODUCT-SPECIFIC
// Provides product-specific results when AI fails
// NO GENERIC TEXT ALLOWED
// ============================================

/**
 * Generate fallback Product Analysis
 * Uses actual product data from input
 */
export function generateProductFallback(input, websiteData) {
  const productName = input.productName || 'Product';
  const companyName = input.companyName || 'Company';
  const industry = input.industry || 'technology';
  const targetAudience = input.targetAudience || 'users';
  const description = input.description || websiteData?.metadata?.description || '';
  
  // Extract features from website if available
  const websiteFeatures = websiteData?.features || [];
  
  return {
    productSummary: description || `${productName} by ${companyName} is a ${industry} solution designed specifically for ${targetAudience}.`,
    productCategory: industry,
    productMaturity: 'Growth',
    businessModel: 'B2B/B2C SaaS',
    revenueModel: 'Subscription',
    jobsToBeDone: [
      { value: `Achieve ${input.campaignGoal || 'goals'}`, confidence: 60, impact: 'High' }
    ],
    valuePropositions: [
      { value: `Specialized ${industry} solution for ${targetAudience}`, confidence: 65, impact: 'High' },
      { value: `Built for ${targetAudience} in ${input.targetCountry || 'global markets'}`, confidence: 60, impact: 'Medium' }
    ],
    keyDifferentiators: [
      { value: `${productName} core functionality`, confidence: 55, impact: 'High' },
      { value: `${targetAudience}-focused interface`, confidence: 50, impact: 'Medium' }
    ],
    painPoints: [
      `${targetAudience} struggle with traditional ${industry} solutions`,
      `Existing tools don't address ${targetAudience} needs`
    ],
    buyerPersonas: [],
    targetUsers: [
      targetAudience,
      `${industry} professionals`,
      `Teams using ${productName}`
    ],
    pricingPosition: input.pricing || `${input.budgetRange || 'Competitive'} pricing`,
    confidenceScore: 45,
    provider: 'fallback'
  };
}

/**
 * Generate fallback Market Discovery
 * Uses actual product and market data with source attribution
 */
export function generateMarketFallback(input, productData) {
  const industry = input.industry || 'this category';
  const targetCountry = input.targetCountry || 'the market';
  const productName = input.productName || 'Product';
  const targetAudience = input.targetAudience || 'target customers';
  
  return {
    tam: {
      value: "$1 Billion",
      source: "Estimated / needs validation",
      confidence: 40,
      method: "Industry estimation based on ${industry} category"
    },
    sam: {
      value: "$200 Million",
      source: "Estimated / needs validation",
      confidence: 40,
      method: "${targetCountry} market subset estimation"
    },
    som: {
      value: "$20 Million",
      source: "Estimated / needs validation",
      confidence: 40,
      method: "Initial market capture projection for ${productName}"
    },
    cagr: {
      value: "10%",
      source: "Estimated / needs validation",
      confidence: 40,
      method: "Industry growth rate estimation"
    },
    marketTrends: [
      { value: `Growing demand for ${industry} solutions in ${targetCountry}`, confidence: 65, impact: 'High' },
      { value: `${targetAudience} increasingly adopting ${industry} technology`, confidence: 60, impact: 'Medium' }
    ],
    demandScore: 65,
    growthOpportunities: [
      { value: `Expand ${productName} to underserved ${targetAudience} segments`, confidence: 65, impact: 'High' },
      { value: `Develop ${industry}-specific features for ${targetCountry}`, confidence: 55, impact: 'Medium' }
    ],
    marketRisks: [
      { value: `Competition in ${industry} space`, confidence: 50, impact: 'High' },
      { value: `${targetAudience} adoption challenges`, confidence: 45, impact: 'Medium' }
    ],
    entryStrategy: `Focus on ${targetAudience} in ${targetCountry} with ${productName}'s unique value: ${input.campaignGoal || 'customer acquisition'}`,
    competitiveLandscape: `${industry} market in ${targetCountry} with opportunities for ${productName}`,
    confidenceScore: 50,
    provider: 'fallback'
  };
}

/**
 * Generate fallback Audience Intelligence
 * Product-specific audience data with relevant personas
 */
export function generateAudienceFallback(input, productData) {
  const targetAudience = input.targetAudience || 'target users';
  const productName = input.productName || 'Product';
  const industry = input.industry || 'industry';
  const targetCountry = input.targetCountry || 'market';
  const campaignGoal = input.campaignGoal || input.businessGoal || 'objectives';
  const companyName = input.companyName || 'Company';
  const websiteUrl = input.websiteUrl || '';
  
  // Generate industry-relevant personas
  let personas = [];
  
  if (industry.toLowerCase().includes('design') || websiteUrl.toLowerCase().includes('figma') || websiteUrl.toLowerCase().includes('design')) {
    personas = [
      { 
        name: 'Product Designer', 
        demographics: 'Design professionals creating digital products and interfaces', 
        intentScore: 85,
        goals: ['Create high-quality designs efficiently', 'Collaborate with development teams', 'Maintain design consistency'], 
        painPoints: ['Handoff to developers is time-consuming', 'Design tools lack real-time collaboration', 'Managing design systems at scale'],
        buyingTrigger: 'Need for better design collaboration workflow',
        objection: 'Will this integrate with existing design tools?'
      },
      { 
        name: 'UX/UI Designer', 
        demographics: 'User experience and interface designers focused on usability', 
        intentScore: 80,
        goals: ['Improve user experience', 'Create intuitive interfaces', 'Test and validate designs'], 
        painPoints: ['Limited prototyping capabilities', 'Difficulty gathering user feedback', 'Inconsistent design patterns'],
        buyingTrigger: 'Need for better UX research and testing tools',
        objection: 'How does this improve my design workflow?'
      },
      { 
        name: 'Design Manager', 
        demographics: 'Team leads managing design teams and design systems', 
        intentScore: 75,
        goals: ['Scale design operations', 'Maintain brand consistency', 'Improve team productivity'], 
        painPoints: ['Managing design system versioning', 'Onboarding new designers', 'Measuring design impact'],
        buyingTrigger: 'Need to scale design team operations',
        objection: 'Will this work for enterprise design teams?'
      }
    ];
  } else if (industry.toLowerCase().includes('saas') || industry.toLowerCase().includes('software')) {
    personas = [
      { 
        name: 'Product Manager', 
        demographics: 'Product professionals managing software product development', 
        intentScore: 80,
        goals: ['Ship products faster', 'Improve product-market fit', 'Gather user feedback'], 
        painPoints: ['Slow development cycles', 'Difficulty prioritizing features', 'Limited user insights'],
        buyingTrigger: 'Need to accelerate product development',
        objection: 'How does this integrate with our existing stack?'
      },
      { 
        name: 'Engineering Lead', 
        demographics: 'Technical leaders managing development teams', 
        intentScore: 75,
        goals: ['Improve code quality', 'Accelerate development', 'Reduce technical debt'], 
        painPoints: ['Legacy code maintenance', 'Slow deployment processes', 'Team coordination challenges'],
        buyingTrigger: 'Need to improve development velocity',
        objection: 'Will this require significant engineering effort?'
      }
    ];
  } else if (industry.toLowerCase().includes('analytics') || industry.toLowerCase().includes('social media') || industry.toLowerCase().includes('influencer') || industry.toLowerCase().includes('marketing') || industry.toLowerCase().includes('creator')) {
    personas = [
      {
        name: 'Social Media Manager',
        demographics: 'Social media professionals managing brand presence across platforms',
        intentScore: 85,
        goals: ['Track content performance across platforms', 'Identify trending content opportunities', 'Report ROI to stakeholders'],
        painPoints: ['Manual data collection across platforms', 'Difficulty measuring content ROI', 'Missing competitor benchmarking data'],
        buyingTrigger: 'Need for unified cross-platform analytics',
        objection: 'Does this integrate with our existing social tools?'
      },
      {
        name: 'Influencer Marketing Manager',
        demographics: 'Marketing professionals managing creator partnerships and campaigns',
        intentScore: 80,
        goals: ['Discover relevant creators', 'Measure campaign performance', 'Optimize influencer ROI'],
        painPoints: ['Finding authentic creators is time-consuming', 'Difficult to track campaign performance', 'No standardized ROI measurement'],
        buyingTrigger: 'Need to scale influencer program with data',
        objection: 'How large is the creator database?'
      },
      {
        name: 'DTC Growth Marketer',
        demographics: 'Growth marketers focused on customer acquisition and retention',
        intentScore: 75,
        goals: ['Acquire customers through social channels', 'Optimize ad creative performance', 'Reduce customer acquisition costs'],
        painPoints: ['Rising ad costs on social platforms', 'Creative fatigue and performance decline', 'Attribution across channels is complex'],
        buyingTrigger: 'Need to improve social ad ROI with better data',
        objection: 'How does this compare to native platform analytics?'
      }
    ];
  } else {
    // Generic fallback personas
    personas = [
      { 
        name: `${targetAudience} Professional`, 
        demographics: `${targetAudience} based in ${targetCountry}, responsible for ${campaignGoal}`, 
        intentScore: 65,
        goals: [`Achieve ${campaignGoal} for their organization`, `Find ${industry} solution that understands ${targetAudience} needs`], 
        painPoints: [`Current ${industry} tools don't fit ${targetAudience} workflows`, `${productName} competitors lack ${targetCountry} focus`],
        buyingTrigger: `${targetAudience} struggling with existing ${industry} tools`,
        objection: `How does ${productName} handle ${targetAudience} specific use cases`
      },
      {
        name: `${industry} Manager`,
        demographics: `Managers responsible for ${industry} strategy and execution in ${targetCountry}`,
        intentScore: 60,
        goals: [`Optimize ${industry} operations`, `Drive ${campaignGoal} through better tools`],
        painPoints: [`Inefficient ${industry} workflows`, `Lack of data-driven insights for ${campaignGoal}`],
        buyingTrigger: `Need to modernize ${industry} approach`,
        objection: `Can ${productName} scale with our growth?`
      },
      {
        name: `${targetCountry} Operations Lead`,
        demographics: `Operations leaders evaluating ${industry} solutions for ${targetCountry} market`,
        intentScore: 55,
        goals: [`Reduce operational costs`, `Improve team productivity with ${industry} tools`],
        painPoints: [`Fragmented ${industry} tool stack`, `Limited ${targetCountry}-specific features`],
        buyingTrigger: `Need end-to-end ${industry} platform`,
        objection: `What is the total cost of ownership?`
      }
    ];
  }
  
  return {
    buyerPersonas: personas,
    personas: personas,
    decisionMakers: [
      `${targetAudience} team leaders managing ${campaignGoal}`,
      `${industry} directors in ${targetCountry}`,
      `${targetAudience} responsible for ${industry} technology decisions`,
      `CFOs evaluating ${productName} ROI for ${targetAudience}`,
      `IT teams assessing ${productName} for ${targetCountry} deployment`
    ],
    bestChannels: [
      input.preferredChannel || 'LinkedIn',
      `${industry}-specific communities where ${targetAudience} gather`,
      `${targetCountry} business networks`,
      `${targetAudience} professional associations`,
      `${industry} events in ${targetCountry}`
    ],
    messagingStyle: `${input.tone || 'Professional'} and direct messaging that speaks to ${targetAudience} challenges in ${targetCountry}, emphasizing how ${productName} helps ${campaignGoal}`,
    confidenceScore: 45,
    provider: 'fallback'
  };
}

/**
 * Generate fallback Competitor Analysis
 * Uses actual competitor names from input or orchestrator
 */
export function generateCompetitorFallback(input, productData, orchestratorCompetitors = []) {
  const competitorsArray = input.competitors ? input.competitors.split(',').map(c => c.trim()) : [];
  const productName = input.productName || 'Product';
  const industry = input.industry || 'industry';
  const targetAudience = input.targetAudience || 'customers';
  const targetCountry = input.targetCountry || 'market';
  const companyName = input.companyName || 'Company';
  
  // Use orchestrator competitors if available
  const verifiedCompetitors = orchestratorCompetitors.length > 0 
    ? orchestratorCompetitors.slice(0, 2).map(c => ({
        name: c.name,
        domain: c.domain,
        opportunityScore: 75,
        trafficEstimate: "50k/mo",
        seoAuthority: 45,
        strengths: [`Verified competitor from ${c.source}`],
        weaknesses: [`Unknown - requires deeper analysis`]
      }))
    : [
      { 
        name: competitorsArray[0] || (industry.toLowerCase().includes('analytics') || industry.toLowerCase().includes('social') ? 'Brandwatch' : 'Market Leader Inc'), 
        domain: competitorsArray[0] ? `${competitorsArray[0]}.com`.toLowerCase().replace(/\s+/g, '') : 'brandwatch.com',
        opportunityScore: 75,
        trafficEstimate: "50k/mo",
        seoAuthority: 45,
        strengths: [`Established brand in ${industry}`, `Large ${targetAudience} base`], 
        weaknesses: [`Legacy technology`, `Slow feature releases`, `High pricing`] 
      },
      { 
        name: competitorsArray[1] || (industry.toLowerCase().includes('analytics') || industry.toLowerCase().includes('social') ? 'Sprout Social' : 'Niche Platform Co'), 
        domain: competitorsArray[1] ? `${competitorsArray[1]}.com`.toLowerCase().replace(/\s+/g, '') : 'sproutsocial.com',
        opportunityScore: 60,
        trafficEstimate: "20k/mo",
        seoAuthority: 35,
        strengths: [`Niche focus`, `Good customer support`], 
        weaknesses: [`Limited integrations`, `Missing advanced features`] 
      }
    ];
  
  return {
    competitors: verifiedCompetitors,
    marketGaps: [
      { value: `Lack of modern ${industry} solutions for ${targetCountry}`, confidence: 50, impact: 'High' }
    ],
    directCompetitors: verifiedCompetitors.map(c => ({
      name: c.name,
      domain: c.domain,
      opportunityScore: c.opportunityScore,
      strengths: c.strengths,
      weaknesses: c.weaknesses
    })),
    indirectCompetitors: [
      `DIY ${industry} approaches used by ${targetAudience}`,
      `Internal tools built by ${targetAudience} teams`,
      `Generic ${industry} solutions not designed for ${targetAudience}`,
      `Manual processes ${targetAudience} use instead of ${productName}`
    ],
    competitorMatrix: `${productName} by ${companyName} competes in ${targetCountry} ${industry} market.`,
    differentiationOpportunities: [],
    strengths: [],
    weaknesses: [],
    confidenceScore: orchestratorCompetitors.length > 0 ? 65 : 50,
    provider: orchestratorCompetitors.length > 0 ? 'orchestrator_fallback' : 'fallback'
  };
}

/**
 * Generate fallback Intent Prediction
 * Product-specific intent signals with industry filtering
 */
export function generateIntentFallback(input, audienceData) {
  const targetAudience = input.targetAudience || 'users';
  const productName = input.productName || 'Product';
  const industry = input.industry || 'industry';
  const campaignGoal = input.campaignGoal || 'goals';
  const companyName = input.companyName || 'Company';
  const targetCountry = input.targetCountry || 'market';
  const websiteUrl = input.websiteUrl || '';
  
  // Filter irrelevant segments based on industry/product
  const isDesignTool = industry.toLowerCase().includes('design') || 
                       websiteUrl.toLowerCase().includes('figma') || 
                       websiteUrl.toLowerCase().includes('design');
  
  const highIntent = [];
  const mediumIntent = [];
  const lowIntent = [];
  
  if (isDesignTool) {
    // Design tool-specific intent segments
    highIntent.push(
      { value: `Design professionals actively searching for ${productName} alternatives`, confidence: 60, impact: 'High' },
      { value: `Design teams evaluating collaborative design tools`, confidence: 55, impact: 'High' }
    );
    mediumIntent.push(
      { value: `UX/UI designers researching design prototyping tools`, confidence: 45, impact: 'Medium' }
    );
    lowIntent.push(
      { value: `Casual users exploring design software options`, confidence: 30, impact: 'Low' }
    );
  } else {
    // Generic fallback intent segments
    highIntent.push(
      { value: `${targetAudience} actively searching for ${productName} alternatives`, confidence: 50, impact: 'High' },
      { value: `${targetCountry} buyers with immediate budget for ${industry}`, confidence: 45, impact: 'High' }
    );
    mediumIntent.push(
      { value: `${targetAudience} researching ${industry} best practices`, confidence: 40, impact: 'Medium' }
    );
    lowIntent.push(
      { value: `Passive ${targetAudience} in related industries`, confidence: 30, impact: 'Low' }
    );
  }
  
  return {
    highIntentSegments: highIntent,
    mediumIntentSegments: mediumIntent,
    lowIntentSegments: lowIntent,
    buyingSignals: [
      `${targetAudience} viewed ${productName} ${targetCountry} pricing`,
      `Downloaded ${productName} ${industry} resources`,
      `${targetAudience} attended ${companyName} demo or webinar`
    ],
    confidenceScore: 45,
    provider: 'fallback'
  };
}

/**
 * Generate fallback Positioning Engine
 * Product-specific positioning
 */
export function generatePositioningFallback(input, productData, competitorData) {
  const productName = input.productName || 'Our Solution';
  const targetAudience = input.targetAudience || 'our customers';
  const industry = input.industry || 'industry';
  const campaignGoal = input.campaignGoal || 'business goals';
  const companyName = input.companyName || 'Company';
  const targetCountry = input.targetCountry || 'market';
  const competitorsArray = input.competitors ? input.competitors.split(',').map(c => c.trim()) : [];
  
  return {
    positioningStatement: `For ${targetAudience} in ${targetCountry} who need to ${input.campaignGoal || 'improve processes'}, ${productName} is the ${industry} solution that delivers ${input.businessGoal || 'measurable results'}.`,
    valueProposition: `${productName} delivers ${campaignGoal} for ${targetAudience} in ${targetCountry} through ${industry} expertise combined with deep understanding of ${targetAudience} workflows.`,
    differentiationAngle: `The only ${industry} solution built exclusively for ${targetAudience} in ${targetCountry}, focused on ${campaignGoal} rather than feature bloat`,
    messagingPillars: [
      { value: `Built specifically for ${targetAudience} needs`, confidence: 55, impact: 'High' },
      { value: `Faster time to value than ${competitorsArray[0] || 'competitors'}`, confidence: 50, impact: 'Medium' }
    ],
    brandPromise: `${companyName} promises ${targetAudience} in ${targetCountry} will ${campaignGoal} faster with ${productName} than any ${industry} alternative, backed by ${targetAudience}-focused ${companyName} support`,
    competitorWeaknessToAttack: [],
    targetPerception: `${productName}: The ${industry} solution ${targetAudience} in ${targetCountry} trust to ${campaignGoal} — built by ${companyName} who understand ${targetAudience} challenges`,
    confidenceScore: 50,
    provider: 'fallback'
  };
}

/**
 * Generate fallback Campaign Generator
 * Product-specific campaign ideas
 */
export function generateCampaignFallback(input, websiteData, allResults) {
  const productName = input.productName || 'Product';
  const targetAudience = input.targetAudience || 'target users';
  const industry = input.industry || 'industry';
  const businessGoal = input.businessGoal || input.campaignGoal || 'business objectives';
  const competitorsArray = input.competitors ? input.competitors.split(',').map(c => c.trim()) : [];
  
  return {
    campaignObjective: `${businessGoal} by showcasing ${productName} to ${targetAudience}`,
    campaignIdeas: [
      { title: `${targetAudience} Acquisition Drive`, concept: `Targeted campaign for ${productName} in ${input.targetCountry || 'market'}`, expectedCtr: "2.1%", expectedCpa: "$25" },
      { title: `${industry} Disruption Campaign`, concept: `Highlighting flaws of ${competitorsArray[0] || 'competitors'}`, expectedCtr: "1.8%", expectedCpa: "$35" }
    ],
    adHooks: [
      { value: `Struggling with ${competitorsArray[0] || 'old tools'}? Try ${productName}.`, confidence: 80 }
    ],
    actionPlan: [
      { timeframe: 'Day 7', task: `Launch initial ${input.preferredChannels || 'marketing'} tests`, owner: 'Marketing Team', priority: 'High', kpi: '50 Leads' },
      { timeframe: 'Day 30', task: `Optimize ${input.targetAudience || 'audience'} targeting`, owner: 'Growth Team', priority: 'High', kpi: 'Lower CPA by 15%' },
      { timeframe: 'Day 60', task: `Expand ${industry} reach via content`, owner: 'Content Team', priority: 'Medium', kpi: 'Double organic traffic' },
      { timeframe: 'Day 90', task: `Scale paid acquisition for ${productName}`, owner: 'Performance Marketing', priority: 'High', kpi: 'Positive ROI' }
    ],
    ctaSuggestions: [
      `Try ${productName} free`,
      `See ${productName} demo`
    ],
    confidenceScore: 50,
    provider: 'fallback'
  };
}

/**
 * Generate fallback Channel Recommendation
 * Product-specific channel strategy with proper structure
 */
export function generateChannelFallback(input, audienceData, campaignData) {
  const isSocialAnalytics = (input.industry || '').toLowerCase().includes('analytics') ||
    (input.industry || '').toLowerCase().includes('social media') ||
    (input.industry || '').toLowerCase().includes('influencer') ||
    (input.industry || '').toLowerCase().includes('creator') ||
    (input.industry || '').toLowerCase().includes('marketing');
  const preferredChannels = input.preferredChannels || input.preferredChannel || (isSocialAnalytics ? ['TikTok', 'Instagram', 'LinkedIn', 'SEO'] : ['LinkedIn']);
  const targetAudience = input.targetAudience || 'target users';
  const industry = input.industry || 'industry';
  const budget = input.budget || '5000';
  const currency = input.currency || 'USD';
  
  // Build channel recommendations from preferred channels
  const channels = [];
  const seenChannels = new Set();
  
  const addChannel = (channel) => {
    if (!seenChannels.has(channel.channelName)) {
      seenChannels.add(channel.channelName);
      channels.push(channel);
    }
  };
  
  if (preferredChannels.includes('LinkedIn') || preferredChannels.includes('LinkedIn Ads')) {
    addChannel({
      channelName: 'LinkedIn Ads',
      reason: `Professional targeting for ${targetAudience} in ${industry}`,
      fitScore: 85,
      confidence: 55,
      impact: 'High',
      budgetRecommendation: `40% of ${currency} ${budget}`,
      expectedOutcome: '3.2x ROI with professional audience',
      source: 'fallback_analysis'
    });
  }
  
  if (preferredChannels.includes('SEO') || preferredChannels.includes('Content Marketing')) {
    addChannel({
      channelName: 'SEO & Content',
      reason: `Organic reach for ${industry} searches by ${targetAudience}`,
      fitScore: 80,
      confidence: 50,
      impact: 'High',
      budgetRecommendation: `30% of ${currency} ${budget}`,
      expectedOutcome: '4.5x ROI with long-term organic traffic',
      source: 'fallback_analysis'
    });
  }
  
  if (preferredChannels.includes('Email')) {
    addChannel({
      channelName: 'Email Marketing',
      reason: `Direct engagement with ${targetAudience} leads`,
      fitScore: 75,
      confidence: 45,
      impact: 'Medium',
      budgetRecommendation: `20% of ${currency} ${budget}`,
      expectedOutcome: '5.0x ROI with high conversion rates',
      source: 'fallback_analysis'
    });
  }
  
  if (preferredChannels.includes('Instagram') || preferredChannels.includes('Influencer Marketing')) {
    addChannel({
      channelName: 'Instagram & Influencers',
      reason: `Visual brand awareness for ${targetAudience}`,
      fitScore: 70,
      confidence: 40,
      impact: 'Medium',
      budgetRecommendation: `10% of ${currency} ${budget}`,
      expectedOutcome: '2.8x ROI with brand awareness',
      source: 'fallback_analysis'
    });
  }
  
  if (preferredChannels.includes('TikTok')) {
    addChannel({
      channelName: 'TikTok Marketing',
      reason: `Short-form video reach for ${targetAudience} engagement`,
      fitScore: 80,
      confidence: 45,
      impact: 'High',
      budgetRecommendation: `25% of ${currency} ${budget}`,
      expectedOutcome: '3.5x ROI with viral potential and creator partnerships',
      source: 'fallback_analysis'
    });
  }
  
  if (preferredChannels.includes('YouTube')) {
    addChannel({
      channelName: 'YouTube Content',
      reason: `Long-form educational content for ${targetAudience}`,
      fitScore: 75,
      confidence: 40,
      impact: 'Medium',
      budgetRecommendation: `20% of ${currency} ${budget}`,
      expectedOutcome: '4.0x ROI with evergreen search traffic',
      source: 'fallback_analysis'
    });
  }
  
  // Fallback if no channels specified
  if (channels.length === 0) {
    addChannel({
      channelName: 'LinkedIn Ads',
      reason: `Professional targeting for ${targetAudience} in ${industry}`,
      fitScore: 85,
      confidence: 55,
      impact: 'High',
      budgetRecommendation: `50% of ${currency} ${budget}`,
      expectedOutcome: '3.2x ROI with professional audience',
      source: 'fallback_analysis'
    });
    addChannel({
      channelName: 'SEO & Content',
      reason: `Organic reach for ${industry} searches by ${targetAudience}`,
      fitScore: 80,
      confidence: 50,
      impact: 'High',
      budgetRecommendation: `30% of ${currency} ${budget}`,
      expectedOutcome: '4.5x ROI with long-term organic traffic',
      source: 'fallback_analysis'
    });
    addChannel({
      channelName: 'Email Marketing',
      reason: `Direct engagement with ${targetAudience} leads`,
      fitScore: 75,
      confidence: 45,
      impact: 'Medium',
      budgetRecommendation: `20% of ${currency} ${budget}`,
      expectedOutcome: '5.0x ROI with high conversion rates',
      source: 'fallback_analysis'
    });
  }
  
  return {
    primaryChannel: channels[0]?.channelName || 'LinkedIn Ads',
    recommendedChannels: channels,
    confidenceScore: 50,
    provider: 'fallback'
  };
}
