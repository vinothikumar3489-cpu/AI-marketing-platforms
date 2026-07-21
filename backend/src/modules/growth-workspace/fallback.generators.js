function inferIndustry(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text,
    websiteData?.metadata?.title
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('saas') || text.includes('software') || text.includes('platform')) return 'SaaS / Technology';
  if (text.includes('health') || text.includes('medical') || text.includes('wellness')) return 'Healthcare';
  if (text.includes('financ') || text.includes('bank') || text.includes('payment') || text.includes('invest')) return 'Financial Services';
  if (text.includes('ecommerce') || text.includes('shop') || text.includes('retail') || text.includes('store')) return 'E-Commerce / Retail';
  if (text.includes('educ') || text.includes('learn') || text.includes('course') || text.includes('train')) return 'Education / EdTech';
  if (text.includes('market') || text.includes('advertis') || text.includes('social media')) return 'Marketing / Advertising';
  if (text.includes('real estate') || text.includes('property') || text.includes('rent')) return 'Real Estate';
  if (text.includes('travel') || text.includes('hotel') || text.includes('tourism')) return 'Travel / Hospitality';
  if (text.includes('food') || text.includes('restaurant') || text.includes('delivery')) return 'Food & Beverage';
  if (text.includes('consult') || text.includes('agency') || text.includes('professional')) return 'Consulting / Professional Services';
  if (text.includes('manufactur') || text.includes('industr') || text.includes('supply chain')) return 'Manufacturing / Industrial';
  return input?.industry || 'Technology / Digital Services';
}

function inferBusinessModel(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text,
    websiteData?.metadata?.title
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('saas') || text.includes('subscription') || text.includes('monthly') || text.includes('annual')) return 'SaaS / Subscription';
  if (text.includes('marketplace') || text.includes('commission') || text.includes('platform fee')) return 'Marketplace / Platform';
  if (text.includes('ecommerce') || text.includes('product') || text.includes('shipping')) return 'E-Commerce / Transactional';
  if (text.includes('freemium') || text.includes('free tier') || text.includes('free plan')) return 'Freemium with Paid Upgrades';
  if (text.includes('agency') || text.includes('consult') || text.includes('service')) return 'Agency / Services';
  if (text.includes('advertis') || text.includes('ad-supported') || text.includes('ad based')) return 'Ad-Supported';
  if (text.includes('license') || text.includes('perpetual') || text.includes('on-premise')) return 'License / On-Premise';
  if (text.includes('lead') || text.includes('referral') || text.includes('affiliate')) return 'Lead Generation / Affiliate';
  return input?.businessModel || 'SaaS / Subscription';
}

function inferPricingModel(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text || '',
    JSON.stringify(websiteData?.pricingText || []),
    JSON.stringify(websiteData?.pricing || [])
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('free') && text.includes('premium')) return 'Freemium';
  if (text.includes('tier') || text.includes('starter') || text.includes('pro') || text.includes('enterprise')) return 'Tiered Subscription';
  if (text.includes('usage') || text.includes('per seat') || text.includes('per user')) return 'Usage-Based / Per-Seat';
  if (text.includes('one-time') || text.includes('lifetime') || text.includes('perpetual')) return 'One-Time Purchase';
  if (text.includes('custom') || text.includes('contact') || text.includes('quote')) return 'Custom / Enterprise Pricing';
  if (text.includes('free trial') && text.includes('month')) return 'Free Trial + Subscription';
  return input?.pricingModel || 'Tiered Subscription';
}

function inferTargetAudience(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text,
    websiteData?.metadata?.title,
    JSON.stringify(websiteData?.ctaTexts || []),
    JSON.stringify(websiteData?.featuresText || [])
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('enterprise') || text.includes('fortune') || text.includes('large team')) return 'Enterprise (500+ employees)';
  if (text.includes('startup') || text.includes('small business') || text.includes('sme') || text.includes('growing')) return 'SMB / Startups (1-500 employees)';
  if (text.includes('developer') || text.includes('engineer') || text.includes('technical')) return 'Developers / Technical Teams';
  if (text.includes('marketer') || text.includes('market') || text.includes('growth')) return 'Marketing Teams';
  if (text.includes('sales') || text.includes('revenue') || text.includes('crm')) return 'Sales Teams';
  if (text.includes('hr') || text.includes('human resource') || text.includes('people')) return 'HR / People Teams';
  if (text.includes('design') || text.includes('creative') || text.includes('ui')) return 'Design / Creative Teams';
  if (text.includes('student') || text.includes('teacher') || text.includes('professor')) return 'Students / Educators';
  if (text.includes('freelancer') || text.includes('solo') || text.includes('independent')) return 'Freelancers / Solopreneurs';
  if (text.includes('individual') || text.includes('personal') || text.includes('consumer')) return 'Individual Consumers';
  return input?.targetAudience || 'Business Professionals';
}

function inferCustomerSegments(input, websiteData) {
  const segments = [];
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('startup') || text.includes('founder')) segments.push('Startups');
  if (text.includes('enterprise') || text.includes('corporate')) segments.push('Enterprise Organizations');
  if (text.includes('sme') || text.includes('small')) segments.push('Small & Medium Businesses');
  if (text.includes('agency')) segments.push('Digital Agencies');
  if (text.includes('developer') || text.includes('engineering')) segments.push('Technical / Engineering Teams');
  if (text.includes('market') || text.includes('growth')) segments.push('Marketing & Growth Teams');
  if (text.includes('product') || text.includes('pm')) segments.push('Product Teams');
  if (text.includes('executive') || text.includes('c-level') || text.includes('vp')) segments.push('Executives / Leadership');
  if (text.includes('freelancer') || text.includes('solo')) segments.push('Freelancers');
  if (text.includes('student') || text.includes('educ')) segments.push('Educational Institutions');

  return segments.length > 0 ? segments : ['Business Professionals', 'Growing Organizations'];
}

function inferUSP(input, websiteData) {
  const text = [
    websiteData?.metadata?.description,
    websiteData?.metadata?.title,
    websiteData?.text
  ].filter(Boolean).join(' ');

  if (text && text.length > 10) {
    const sentences = text.match(/[^.!?\n]+[.!?]/g) || [];
    const claims = sentences.filter(s =>
      s.toLowerCase().includes('most') ||
      s.toLowerCase().includes('best') ||
      s.toLowerCase().includes('first') ||
      s.toLowerCase().includes('only') ||
      s.toLowerCase().includes('fastest') ||
      s.toLowerCase().includes('easiest') ||
      s.toLowerCase().includes('leading') ||
      s.toLowerCase().includes('#1') ||
      s.toLowerCase().includes('number one') ||
      s.toLowerCase().includes('unlike') ||
      s.toLowerCase().includes('powerful')
    );
    if (claims.length > 0) {
      return claims[0].trim().substring(0, 200);
    }
  }
  return input?.usp || (input?.description ? input.description.substring(0, 150) + '...' : null);
}

function inferProductCategory(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text,
    websiteData?.metadata?.title,
    JSON.stringify(websiteData?.featuresText || [])
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('crm') || text.includes('sales')) return 'CRM / Sales Platform';
  if (text.includes('market') && text.includes('automation')) return 'Marketing Automation';
  if (text.includes('analytics') || text.includes('dashboard') || text.includes('insight')) return 'Business Intelligence / Analytics';
  if (text.includes('project') || text.includes('task') || text.includes('workflow')) return 'Project Management';
  if (text.includes('communication') || text.includes('chat') || text.includes('messaging')) return 'Communication / Collaboration';
  if (text.includes('hr') || text.includes('payroll') || text.includes('employee')) return 'HR / People Management';
  if (text.includes('finance') || text.includes('accounting') || text.includes('invoice')) return 'Finance / Accounting';
  if (text.includes('ai') && text.includes('content')) return 'AI Content Creation';
  if (text.includes('seo') || text.includes('search')) return 'SEO / Search Marketing';
  if (text.includes('email') && text.includes('market')) return 'Email Marketing';
  if (text.includes('design') || text.includes('creative')) return 'Design / Creative Tools';
  if (text.includes('support') || text.includes('helpdesk') || text.includes('ticket')) return 'Customer Support';
  if (text.includes('ecommerce') || text.includes('shop')) return 'E-Commerce Platform';
  return input?.productCategory || 'SaaS Platform';
}

function inferCompanyStage(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('series a') || text.includes('series b') || text.includes('funded') || text.includes('venture')) return 'Venture-Backed Growth';
  if (text.includes('bootstrapped') || text.includes('profitable') || text.includes('self-funded')) return 'Bootstrapped / Profitable';
  if (text.includes('enterprise') || text.includes('fortune') || text.includes('publicly')) return 'Enterprise / Public';
  if (text.includes('startup') || text.includes('early') || text.includes('launch') || text.includes('beta')) return 'Early Stage / Startup';
  if (text.includes('established') || text.includes('mature') || text.includes('leading')) return 'Established / Mature';
  if (text.includes('accelerator') || text.includes('incubator') || text.includes('seed')) return 'Seed Stage';
  return input?.companyStage || 'Growth Stage';
}

function inferGeography(input, websiteData) {
  const text = [
    input?.description,
    websiteData?.metadata?.description,
    websiteData?.text,
    websiteData?.metadata?.title
  ].filter(Boolean).join(' ').toLowerCase();

  if (text.includes('global') || text.includes('worldwide') || text.includes('international')) return 'Global';
  if (text.includes('united states') || text.includes('us') || text.includes('america')) return 'United States (Primary) / Global';
  if (text.includes('europe') || text.includes('eu') || text.includes('uk') || text.includes('germany') || text.includes('france')) return 'Europe / Global';
  if (text.includes('asia') || text.includes('apac') || text.includes('china') || text.includes('india')) return 'Asia Pacific / Global';
  if (text.includes('latin') || text.includes('latam') || text.includes('brazil')) return 'Latin America / Global';
  return input?.targetCountry ? `${input.targetCountry} (Primary) / Global` : 'Global / Multi-Region';
}

export function generateProductFallback(input, websiteData) {
  const description = websiteData?.metadata?.description || input?.description || '';
  const inferredIndustry = inferIndustry(input, websiteData);
  const inferredBusinessModel = inferBusinessModel(input, websiteData);
  const inferredPricing = inferPricingModel(input, websiteData);
  const inferredAudience = inferTargetAudience(input, websiteData);
  const inferredSegments = inferCustomerSegments(input, websiteData);
  const inferredUSP = inferUSP(input, websiteData);
  const inferredCategory = inferProductCategory(input, websiteData);
  const inferredStage = inferCompanyStage(input, websiteData);
  const inferredGeography = inferGeography(input, websiteData);

  return {
    productSummary: description || `${input?.productName || 'This product'} is a ${inferredCategory.toLowerCase()} serving ${inferredAudience.toLowerCase()} with a ${inferredBusinessModel.toLowerCase()} model in the ${inferredIndustry.toLowerCase()} industry.`,
    productCategory: inferredCategory,
    productMaturity: inferredStage,
    businessModel: inferredBusinessModel,
    pricingModel: inferredPricing,
    targetAudience: inferredAudience,
    customerSegments: inferredSegments,
    usp: inferredUSP || `Differentiated ${inferredCategory.toLowerCase()} for ${inferredAudience.toLowerCase()}`,
    positioning: `${inferredCategory} for ${inferredAudience} looking to improve business outcomes`,
    valueProposition: `Helps ${inferredAudience.toLowerCase()} achieve better results through ${inferredCategory.toLowerCase()} technology`,
    revenueModel: inferredPricing,
    jobsToBeDone: [
      { value: `Streamline ${inferredCategory.toLowerCase()} workflows`, confidence: 35, impact: 'High' },
      { value: `Improve efficiency for ${inferredAudience.toLowerCase()}`, confidence: 30, impact: 'Medium' },
      { value: `Reduce operational costs through automation`, confidence: 25, impact: 'Medium' }
    ],
    valuePropositions: [
      { value: inferredUSP ? inferredUSP.substring(0, 100) : `Comprehensive ${inferredCategory.toLowerCase()} solution`, confidence: 40, impact: 'High' },
      { value: `Built specifically for ${inferredAudience.toLowerCase()}`, confidence: 35, impact: 'Medium' },
      { value: `Industry-leading ${inferredCategory.toLowerCase()} capabilities`, confidence: 25, impact: 'Medium' }
    ],
    keyDifferentiators: [
      { value: `Specialized ${inferredCategory.toLowerCase()} focus`, confidence: 30, impact: 'Medium' },
      { value: `Designed for ${inferredAudience.toLowerCase()} needs`, confidence: 30, impact: 'Medium' },
      { value: `${inferredBusinessModel} delivery model`, confidence: 25, impact: 'Low' }
    ],
    painPoints: [
      { value: `Inefficient ${inferredCategory.toLowerCase()} management`, confidence: 30, impact: 'High' },
      { value: `Lack of visibility into ${inferredCategory.toLowerCase()} performance`, confidence: 25, impact: 'Medium' },
      { value: `High costs associated with ${inferredCategory.toLowerCase()}`, confidence: 20, impact: 'Medium' }
    ],
    buyerPersonas: [
      {
        name: inferredAudience.includes('Enterprise') ? 'Enterprise Decision Maker' :
             inferredAudience.includes('Developer') ? 'Technical Lead' :
             inferredAudience.includes('Market') ? 'Marketing Manager' : 'Business Professional',
        role: inferredAudience.includes('Enterprise') ? 'VP / Director' :
              inferredAudience.includes('Developer') ? 'Engineering Manager' :
              inferredAudience.includes('Market') ? 'Marketing Director' : 'Department Head',
        demographics: `Works in ${inferredIndustry} industry, responsible for ${inferredCategory.toLowerCase()} decisions`,
        goals: [`Improve ${inferredCategory.toLowerCase()} efficiency`, `Reduce operational overhead`],
        painPoints: [`Current ${inferredCategory.toLowerCase()} tools are inadequate`, `Need better ${inferredCategory.toLowerCase()} capabilities`]
      }
    ],
    targetUsers: inferredSegments.map(s => ({ value: s, confidence: 30, impact: 'Medium' })),
    pricingPosition: inferredPricing,
    industry: inferredIndustry,
    companyStage: inferredStage,
    geography: inferredGeography,
    confidenceScore: 25,
    provider: 'inference_engine'
  };
}

export function generateMarketFallback(input, productData) {
  const industry = productData?.industry || inferIndustry(input, null);
  const stage = productData?.companyStage || inferCompanyStage(input, null);
  const audience = productData?.targetAudience || inferTargetAudience(input, null);
  const productName = input?.productName || 'this product';

  const tamRanges = {
    'SaaS / Technology': ['$50B', '$200B', 'Global software market'],
    'Healthcare': ['$100B', '$500B', 'Global healthcare IT market'],
    'Financial Services': ['$150B', '$500B', 'Global fintech market'],
    'E-Commerce / Retail': ['$200B', '$800B', 'Global e-commerce technology market'],
    'Education / EdTech': ['$50B', '$250B', 'Global edtech market'],
    'Marketing / Advertising': ['$100B', '$400B', 'Global marketing technology market'],
    'Real Estate': ['$30B', '$100B', 'Global proptech market'],
    'Travel / Hospitality': ['$50B', '$200B', 'Global travel technology market'],
    'Food & Beverage': ['$20B', '$100B', 'Global food tech market'],
    'Consulting / Professional Services': ['$30B', '$150B', 'Global professional services automation market'],
    'Manufacturing / Industrial': ['$50B', '$200B', 'Global industrial software market']
  };

  const tamInfo = tamRanges[industry] || ['$30B', '$100B', `Global ${industry?.toLowerCase() || 'technology'} market`];

  const stageMultiplier = stage?.includes('Startup') ? 0.01 :
                          stage?.includes('Seed') ? 0.005 :
                          stage?.includes('Bootstrapped') ? 0.02 :
                          stage?.includes('Growth') ? 0.05 :
                          stage?.includes('Enterprise') ? 0.15 : 0.03;

  return {
    tam: `${tamInfo[0]} – ${tamInfo[1]}`,
    tamConfidence: 'Estimated (industry benchmark)',
    tamSource: tamInfo[2],
    sam: `Estimated ${Math.round(stageMultiplier * 100)}% – ${Math.round(stageMultiplier * 200)}% of TAM (${audience.toLowerCase()} segment)`,
    samConfidence: 'Estimated (audience-based projection)',
    som: `Realistic near-term: ${Math.round(stageMultiplier * 5)}% – ${Math.round(stageMultiplier * 15)}% of SAM`,
    somConfidence: 'Estimated (stage-adjusted projection)',
    cagr: `Industry average for ${industry}: 12% – 18% CAGR`,
    growthRate: `Estimated ${Math.round(12 + Math.random() * 6)}% – ${Math.round(18 + Math.random() * 7)}% (${industry} sector)`,
    growthRateConfidence: 'Estimated (industry benchmark)',
    marketTrends: [
      { value: `Growing adoption of ${industry?.toLowerCase() || 'technology'} solutions by ${audience.toLowerCase()}`, confidence: 50, impact: 'High' },
      { value: `Digital transformation accelerating demand for automation`, confidence: 45, impact: 'High' },
      { value: `Increasing focus on AI-powered ${industry?.toLowerCase() || 'business'} tools`, confidence: 40, impact: 'Medium' },
      { value: `Remote work driving need for cloud-based solutions`, confidence: 45, impact: 'Medium' },
      { value: `Consolidation of ${industry?.toLowerCase() || 'technology'} vendors creating market opportunities`, confidence: 35, impact: 'Medium' }
    ],
    growthSignals: [
      { signal: `${industry} sector seeing ${Math.round(12 + Math.random() * 8)}% year-over-year growth in digital adoption`, source: 'Industry analysis', confidence: 50 },
      { signal: `${audience} increasingly investing in ${industry?.toLowerCase() || 'technology'} solutions`, source: 'Market research', confidence: 45 },
      { signal: `Competitors in ${industry} raising funding and expanding`, source: 'Market intelligence', confidence: 40 }
    ],
    opportunities: [
      { value: `Expand into adjacent ${industry?.toLowerCase() || 'market'} segments`, confidence: 40, impact: 'High' },
      { value: `Develop AI-powered features to differentiate from competitors`, confidence: 35, impact: 'High' },
      { value: `Target ${audience.toLowerCase()} with specialized solutions`, confidence: 40, impact: 'Medium' },
      { value: `Build strategic partnerships within ${industry} ecosystem`, confidence: 30, impact: 'Medium' }
    ],
    risks: [
      { value: `Intense competition from established ${industry} players`, confidence: 50, impact: 'High' },
      { value: `Market saturation in core ${industry} segments`, confidence: 35, impact: 'Medium' },
      { value: `Changing regulatory landscape affecting ${industry}`, confidence: 30, impact: 'Medium' }
    ],
    demandScore: 65,
    confidenceScore: 40,
    provider: 'inference_engine'
  };
}

export function generateAudienceFallback(input, productData) {
  return {
    buyerPersonas: [
      {
        name: productData?.targetAudience?.includes('Enterprise') ? 'Enterprise Decision Maker' :
             productData?.targetAudience?.includes('Developer') ? 'Technical Lead' :
             productData?.targetAudience?.includes('Market') ? 'Marketing Director' : 'Business Professional',
        role: 'Primary Decision Maker',
        demographics: `Professional in ${productData?.industry || 'technology'} industry`,
        goals: [`Improve operational efficiency`, `Drive business growth`, `Stay competitive`],
        painPoints: [`Current solutions lack critical features`, `Need for better integration capabilities`, `High cost of existing tools`],
        intentScore: 60,
        buyingAuthority: 'Recommended / Decision'
      }
    ],
    personas: [],
    decisionMakers: [
      { value: productData?.targetAudience?.includes('Enterprise') ? 'CTO / CIO' :
               productData?.targetAudience?.includes('Developer') ? 'Engineering VP' :
               productData?.targetAudience?.includes('Market') ? 'CMO / Marketing VP' : 'Department Head', confidence: 40, impact: 'High' },
      { value: productData?.targetAudience?.includes('Enterprise') ? 'VP of Operations' : 'Team Lead / Manager', confidence: 35, impact: 'Medium' }
    ],
    bestChannels: productData?.targetAudience?.includes('Enterprise') ?
      [{ value: 'LinkedIn', confidence: 50, impact: 'High' }, { value: 'Industry Events', confidence: 40, impact: 'Medium' }, { value: 'Email', confidence: 45, impact: 'High' }] :
      productData?.targetAudience?.includes('Developer') ?
      [{ value: 'GitHub / Developer Communities', confidence: 50, impact: 'High' }, { value: 'Technical Blogs', confidence: 45, impact: 'Medium' }, { value: 'Twitter/X', confidence: 40, impact: 'Medium' }] :
      [{ value: 'LinkedIn', confidence: 45, impact: 'High' }, { value: 'Content Marketing', confidence: 40, impact: 'Medium' }, { value: 'Search (SEO/SEM)', confidence: 40, impact: 'High' }],
    buyingTriggers: [
      { value: `Need for better ${productData?.productCategory?.toLowerCase() || 'solution'}`, confidence: 40, impact: 'Medium' },
      { value: 'Dissatisfaction with current provider', confidence: 35, impact: 'High' },
      { value: 'Budget allocation for new initiatives', confidence: 30, impact: 'Medium' }
    ],
    commonObjections: [
      { value: 'Cost / Budget constraints', confidence: 50, impact: 'High' },
      { value: 'Implementation complexity', confidence: 40, impact: 'Medium' },
      { value: 'Integration with existing stack', confidence: 40, impact: 'Medium' }
    ],
    messagingStyle: `Professional, benefit-focused targeting ${productData?.targetAudience?.toLowerCase() || 'business professionals'} in the ${productData?.industry?.toLowerCase() || 'technology'} industry`,
    confidenceScore: 30,
    provider: 'inference_engine'
  };
}

export function generateCompetitorFallback(input, productData, orchestratorCompetitors = []) {
  const verifiedCompetitors = orchestratorCompetitors.length > 0 
    ? orchestratorCompetitors.slice(0, 5).map(c => ({
        name: c.name, domain: c.domain, opportunityScore: null,
        trafficEstimate: 'Estimated', seoAuthority: null,
        featureOverlap: 50, pricingOverlap: 50, audienceOverlap: 50,
        seoOverlap: 40, aiSimilarityScore: 50,
        strengths: [], weaknesses: [],
        evidence: `Identified via ${c.source || 'SERP analysis'}`,
        source: c.source || 'orchestrator'
      }))
    : [];

  const industry = productData?.industry || inferIndustry(input, null);
  const category = productData?.productCategory || 'software';
  const audience = productData?.targetAudience || 'business professionals';

  const inferredCompetitors = verifiedCompetitors.length === 0 ? [
    { name: 'Industry Leader (Direct)', domain: null, opportunityScore: 60, trafficEstimate: 'Estimated', seoAuthority: 70, featureOverlap: 65, pricingOverlap: 55, audienceOverlap: 70, seoOverlap: 60, aiSimilarityScore: 65, strengths: ['Market presence', 'Brand recognition'], weaknesses: ['Higher pricing', 'Slower innovation'], evidence: `Inferred from ${category} market analysis`, source: 'inference_engine' },
    { name: 'Mid-Market Competitor', domain: null, opportunityScore: 70, trafficEstimate: 'Estimated', seoAuthority: 50, featureOverlap: 55, pricingOverlap: 70, audienceOverlap: 65, seoOverlap: 50, aiSimilarityScore: 60, strengths: ['Competitive pricing', 'Good feature set'], weaknesses: ['Limited scale', 'Smaller team'], evidence: `Inferred from ${industry} competitive landscape`, source: 'inference_engine' },
    { name: 'Emerging Challenger', domain: null, opportunityScore: 75, trafficEstimate: 'Estimated', seoAuthority: 35, featureOverlap: 45, pricingOverlap: 65, audienceOverlap: 55, seoOverlap: 40, aiSimilarityScore: 55, strengths: ['Innovation focus', 'Modern tech stack'], weaknesses: ['Small market share', 'Limited integrations'], evidence: `Inferred from ${category} market trends`, source: 'inference_engine' }
  ] : [];

  const allCompetitors = [...verifiedCompetitors, ...inferredCompetitors];

  return {
    competitors: allCompetitors,
    marketGaps: [
      { value: `Better ${audience.toLowerCase()} experience compared to incumbents`, confidence: 35, impact: 'High' },
      { value: `More flexible ${category.toLowerCase()} for modern teams`, confidence: 30, impact: 'Medium' },
      { value: `Lower total cost of ownership for ${audience.toLowerCase()}`, confidence: 30, impact: 'Medium' }
    ],
    directCompetitors: allCompetitors.map(c => ({
      name: c.name, domain: c.domain, opportunityScore: c.opportunityScore,
      featureOverlap: c.featureOverlap, pricingOverlap: c.pricingOverlap,
      audienceOverlap: c.audienceOverlap, seoOverlap: c.seoOverlap,
      aiSimilarityScore: c.aiSimilarityScore,
      strengths: c.strengths || [], weaknesses: c.weaknesses || [],
      evidence: c.evidence, source: c.source
    })),
    indirectCompetitors: [
      { name: 'DIY / Build In-House', domain: null, opportunityScore: 80, featureOverlap: 20, pricingOverlap: 90, audienceOverlap: 60, seoOverlap: 10, aiSimilarityScore: 25, strengths: ['Full control'], weaknesses: ['High maintenance'], evidence: `Inferred build-vs-buy analysis`, source: 'inference_engine' },
      { name: 'Traditional Agency Services', domain: null, opportunityScore: 65, featureOverlap: 30, pricingOverlap: 40, audienceOverlap: 50, seoOverlap: 15, aiSimilarityScore: 30, strengths: ['Personalized service'], weaknesses: ['Expensive', 'Slow'], evidence: `Inferred from market alternatives`, source: 'inference_engine' }
    ],
    competitorMatrix: `${allCompetitors.length} competitors identified (${verifiedCompetitors.length} verified, ${inferredCompetitors.length} inferred)`,
    differentiationOpportunities: [
      { value: `Superior ${audience.toLowerCase()} experience and usability`, confidence: 40, impact: 'High' },
      { value: `Better integration ecosystem for ${industry}`, confidence: 35, impact: 'Medium' },
      { value: `More transparent pricing model`, confidence: 35, impact: 'Medium' }
    ],
    strengths: [{ value: 'Specialized focus on target market', confidence: 30, impact: 'Medium' }],
    weaknesses: [{ value: 'Limited brand recognition vs incumbents', confidence: 45, impact: 'High' }],
    confidenceScore: 35,
    provider: 'inference_engine'
  };
}

export { inferIndustry, inferBusinessModel, inferPricingModel, inferTargetAudience, inferCustomerSegments, inferUSP, inferProductCategory, inferCompanyStage, inferGeography };

export function generateIntentFallback(input, audienceData) {
  return {
    highIntentSegments: [
      { value: 'Active buyers researching solutions', confidence: 40, impact: 'High' },
      { value: 'Users comparing alternatives', confidence: 35, impact: 'High' }
    ],
    mediumIntentSegments: [
      { value: 'Professionals evaluating new tools', confidence: 40, impact: 'Medium' },
      { value: 'Teams experiencing pain with current solutions', confidence: 35, impact: 'Medium' }
    ],
    lowIntentSegments: [
      { value: 'Early-stage researchers', confidence: 35, impact: 'Low' },
      { value: 'General industry awareness audience', confidence: 30, impact: 'Low' }
    ],
    buyingSignals: [
      { value: 'Searching for alternatives to existing tools', confidence: 35, impact: 'High' },
      { value: 'Engaging with comparison content', confidence: 30, impact: 'Medium' },
      { value: 'Requesting pricing and demos', confidence: 40, impact: 'High' }
    ],
    triggerEvents: [
      { value: 'Budget planning for new fiscal year', confidence: 35, impact: 'Medium' },
      { value: 'Contract renewal with current provider', confidence: 40, impact: 'High' },
      { value: 'Team scaling beyond current tool capabilities', confidence: 35, impact: 'Medium' }
    ],
    confidenceScore: 35,
    provider: 'inference_engine'
  };
}

export function generatePositioningFallback(input, productData, competitorData) {
  const productName = input?.productName || 'this solution';
  const audience = productData?.targetAudience || inferTargetAudience(input, null);
  const industry = productData?.industry || inferIndustry(input, null);

  return {
    positioningStatement: `The leading ${(productData?.productCategory || 'intelligent').toLowerCase()} platform that helps ${audience.toLowerCase()} achieve better outcomes through ${industry?.toLowerCase() || 'innovative'} technology.`,
    valueProposition: `${productName} empowers ${audience.toLowerCase()} with ${(productData?.productCategory || 'powerful').toLowerCase()} tools to drive measurable business results.`,
    differentiationAngle: `Unlike traditional solutions, ${productName} is built specifically for ${audience.toLowerCase()}, offering superior usability and faster time-to-value.`,
    messagingPillars: [
      { value: `Purpose-built for ${audience.toLowerCase()}`, confidence: 40, impact: 'High' },
      { value: `Faster time-to-value compared to alternatives`, confidence: 35, impact: 'High' },
      { value: `Comprehensive ${(productData?.productCategory || 'solution').toLowerCase()} in one platform`, confidence: 35, impact: 'Medium' },
      { value: `Enterprise-grade security and reliability`, confidence: 30, impact: 'Medium' }
    ],
    brandPromise: `Empower your ${audience.toLowerCase()} team with the best ${(productData?.productCategory || 'platform').toLowerCase()} experience`,
    competitorWeaknessToAttack: [
      { value: 'Incumbents have complex, outdated interfaces', confidence: 40, impact: 'High' },
      { value: 'Traditional solutions are expensive and inflexible', confidence: 35, impact: 'Medium' },
      { value: 'Competitors lack modern integration capabilities', confidence: 30, impact: 'Medium' }
    ],
    targetPerception: `Be perceived as the modern, innovative choice for ${audience.toLowerCase()} looking to upgrade their ${(productData?.productCategory || 'technology').toLowerCase()} stack`,
    confidenceScore: 35,
    provider: 'inference_engine'
  };
}

export function generateCampaignFallback(input, websiteData, allResults) {
  const name = input?.productName || 'the product';
  const audience = allResults?.product?.targetAudience || inferTargetAudience(input, null);
  const industry = allResults?.product?.industry || inferIndustry(input, null);
  const category = allResults?.product?.productCategory || inferProductCategory(input, null);

  return {
    status: 'GENERATED',
    campaignObjective: `Drive awareness and adoption of ${name} among ${audience.toLowerCase()}`,
    campaignPhases: [
      { phase: 'Awareness', duration: '1-2 weeks', objective: `Build awareness of ${name} among ${audience.toLowerCase()}`, channels: ['LinkedIn', 'Content Marketing'], kpis: [{ metric: 'Impressions', target: '10,000+', status: 'on_track' }] },
      { phase: 'Consideration', duration: '3-4 weeks', objective: `Educate ${audience.toLowerCase()} on ${name} benefits and differentiators`, channels: ['Email', 'Webinars', 'Case Studies'], kpis: [{ metric: 'Lead Quality', target: '50+ MQLs', status: 'on_track' }] },
      { phase: 'Conversion', duration: '5-8 weeks', objective: 'Convert qualified leads to trials and demos', channels: ['Sales Outreach', 'Retargeting', 'Demo Requests'], kpis: [{ metric: 'Trial Signups', target: '100+', status: 'on_track' }] }
    ],
    creativeAngles: [
      { value: `Modernize your ${category.toLowerCase()} stack with ${name}`, confidence: 40, impact: 'High' },
      { value: `Why ${audience} are switching to ${name}`, confidence: 35, impact: 'High' },
      { value: `The ${industry} platform built for today's challenges`, confidence: 35, impact: 'Medium' }
    ],
    copyHooks: [
      { value: `Stop settling for outdated ${category.toLowerCase()} tools`, confidence: 40, impact: 'High' },
      { value: `95% of ${audience.toLowerCase()} are missing this`, confidence: 30, impact: 'High' },
      { value: `The ${category.toLowerCase()} platform ${audience} actually love using`, confidence: 35, impact: 'Medium' }
    ],
    ctaSuggestions: [
      { value: `Try ${name} Free`, confidence: 45, impact: 'High' },
      { value: `See How ${name} Works`, confidence: 40, impact: 'Medium' },
      { value: `Get Started with ${name}`, confidence: 40, impact: 'High' }
    ],
    buyingStage: 'awareness',
    availableRecommendations: [
      `Run complete Growth Analysis for ${name} to generate deeper campaign angles`,
      `Configure website URL for audience and competitor evidence`,
      `Complete Product Analysis for feature-based messaging`
    ],
    missingEvidence: [],
    generationWarnings: ['Campaign generated using inference engine - run full analysis for deeper insights'],
    actionPlan: {
      sevenDay: [],
      thirtyDay: [],
      sixtyDay: [],
      ninetyDay: [],
      day180: [],
      day365: []
    },
    confidenceScore: 30,
    provider: 'inference_engine'
  };
}

export function generateChannelFallback(input, audienceData, campaignData) {
  const audience = audienceData?.targetAudience || input?.targetAudience || 'business professionals';

  const channelRecs = audience.includes('Enterprise') ?
    [{ channel: 'LinkedIn', fit: 'Enterprise professionals', reasoning: 'Primary network for B2B decision makers' },
     { channel: 'Email Marketing', fit: 'Direct outreach channel', reasoning: 'High ROI for B2B communications' },
     { channel: 'Industry Events', fit: 'In-person engagement', reasoning: 'Trust building with enterprise buyers' },
     { channel: 'Content Marketing', fit: 'SEO-driven awareness', reasoning: 'Educational content for informed buyers' }] :
    audience.includes('Developer') ?
    [{ channel: 'GitHub', fit: 'Developer community', reasoning: 'Primary platform for technical audience' },
     { channel: 'Technical Blogs', fit: 'In-depth technical content', reasoning: 'Engineers prefer detailed docs' },
     { channel: 'Twitter/X', fit: 'Real-time engagement', reasoning: 'Active developer community' },
     { channel: 'Hacker News', fit: 'Tech-savvy audience', reasoning: 'Viral potential for technical products' }] :
    [{ channel: 'LinkedIn', fit: 'Professional network', reasoning: 'B2B audience targeting' },
     { channel: 'Content Marketing', fit: 'SEO-driven inbound', reasoning: 'Long-term organic growth' },
     { channel: 'Email Marketing', fit: 'Direct engagement', reasoning: 'High conversion channel' },
     { channel: 'Search (SEM)', fit: 'Intent-based targeting', reasoning: 'Captures active buyers' }];

  return {
    primaryChannel: channelRecs[0].channel,
    recommendedChannels: channelRecs.map(c => ({ ...c, confidence: 40, impact: 'Medium' })),
    channelStrategy: `Multi-channel approach targeting ${audience.toLowerCase()} through their preferred platforms`,
    confidenceScore: 35,
    provider: 'inference_engine'
  };
}
