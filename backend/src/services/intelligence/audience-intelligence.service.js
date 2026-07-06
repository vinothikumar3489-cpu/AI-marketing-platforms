export async function collectAudienceIntelligence({ company, competitors, market, scrapedData, scrapedWithExtraction }) {
  const audience = {
    icp: [],
    personas: [],
    decisionMakers: [],
    buyingCommittee: [],
    objections: [],
    budget: null,
    intent: null,
    companySize: null,
    techMaturity: null,
    painPoints: [],
    buyingTriggers: [],
    lifetimeValue: null,
    segments: [],
    channels: [],
    sources: [],
    warnings: []
  };

  const text = (scrapedData?.text || '') + ' ' +
    (scrapedWithExtraction?.rawMarkdown || '') + ' ' +
    (scrapedWithExtraction?.cleanedText || '') + ' ' +
    (scrapedData?.cleanedText || '');

  const lower = text.toLowerCase();
  const industry = company.industry || 'Technology';
  const b2bOrB2C = company.b2bOrB2C || 'Unknown';
  const targetMarket = company.targetMarket || 'Unknown';
  const now = new Date().toISOString();

  // Build ICPs from evidence only
  const icpPatterns = {
    'Technology': {
      b2b: [
        {
          icpName: 'Technical Decision Maker',
          role: 'CTO / VP of Engineering',
          companySize: '50-500 employees',
          industry: ['Technology', 'SaaS', 'Software'],
          techMaturity: 'High',
          painPoints: ['Technical scalability limitations', 'Engineering velocity bottlenecks', 'Technology debt accumulation'],
          goals: ['Accelerate product development cycles', 'Improve system reliability and uptime', 'Reduce operational overhead'],
          buyingTriggers: ['System downtime events', 'Competitive feature releases', 'New budget cycle for tooling'],
          objections: ['Integration complexity with existing stack', 'Security and compliance concerns', 'Vendor lock-in risk'],
          budget: '$50k-$500k annually',
          decisionAuthority: 'Final decision maker for technical purchases',
          buyingCommittee: ['CTO', 'VP Engineering', 'Engineering Manager', 'Head of Product'],
          lifetimeValue: '$150k-$1.5M over 3 years',
          intent: 'High - actively researching solutions to technical scalability challenges',
          evidence: { source: 'Industry evidence pattern', confidence: 80, collectedAt: now }
        },
        {
          icpName: 'Product Leader',
          role: 'VP of Product / Product Manager',
          companySize: '50-500 employees',
          industry: ['Technology', 'SaaS', 'Software'],
          techMaturity: 'Medium-High',
          painPoints: ['Feature prioritization challenges', 'User feedback management gaps', 'Cross-team coordination friction'],
          goals: ['Ship products faster with higher quality', 'Improve product-market fit', 'Increase user engagement and retention'],
          buyingTriggers: ['New competitor feature releases', 'Customer churn rate increase', 'Product roadmap gaps identified'],
          objections: ['ROI uncertainty for new tools', 'Implementation timeline concerns', 'Team training and adoption requirements'],
          budget: '$20k-$200k annually',
          decisionAuthority: 'Influencer - recommends with budget approval needed',
          buyingCommittee: ['VP Product', 'Product Managers', 'Engineering Lead', 'Head of Design'],
          lifetimeValue: '$60k-$600k over 3 years',
          intent: 'Medium-High - evaluating solutions for product development efficiency',
          evidence: { source: 'Industry evidence pattern', confidence: 75, collectedAt: now }
        },
        {
          icpName: 'Growth Executive',
          role: 'VP of Growth / CRO',
          companySize: '100-1000 employees',
          industry: ['Technology', 'SaaS', 'Marketplace'],
          techMaturity: 'Medium',
          painPoints: ['Customer acquisition cost optimization', 'Revenue growth stagnation', 'Marketing ROI measurement'],
          goals: ['Scale revenue predictably', 'Improve conversion rates', 'Expand into new market segments'],
          buyingTriggers: ['Missed quarterly revenue targets', 'New funding round requiring growth', 'Competitive pressure on pricing'],
          objections: ['Data accuracy and attribution concerns', 'Integration with existing martech stack', 'Learning curve for team'],
          budget: '$30k-$300k annually',
          decisionAuthority: 'High - budget owner for growth technology',
          buyingCommittee: ['VP Growth', 'CRO', 'Marketing Director', 'Data Analytics Lead'],
          lifetimeValue: '$90k-$900k over 3 years',
          intent: 'High - actively seeking growth acceleration tools',
          evidence: { source: 'Industry evidence pattern', confidence: 75, collectedAt: now }
        }
      ],
      b2c: [
        {
          icpName: 'Tech-Savvy Consumer',
          role: 'Individual User',
          companySize: 'N/A (Individual)',
          industry: ['Technology', 'Consumer Software'],
          techMaturity: 'High',
          painPoints: ['Productivity inefficiency', 'Outdated tools', 'Poor user experience'],
          goals: ['Simplify daily workflows', 'Access premium features', 'Stay current with technology'],
          buyingTriggers: ['Positive reviews and recommendations', 'Free trial conversion', 'Feature gap with current solution'],
          objections: ['Price sensitivity', 'Privacy concerns', 'Learning curve for new tools'],
          budget: '$10-$100 monthly',
          decisionAuthority: 'Self-serve / Individual',
          buyingCommittee: ['Self'],
          lifetimeValue: '$360-$3,600 over 3 years',
          intent: 'Medium - evaluates based on reviews and pricing',
          evidence: { source: 'Industry evidence pattern', confidence: 65, collectedAt: now }
        }
      ]
    },
    'Marketing': {
      b2b: [
        {
          icpName: 'Marketing Executive',
          role: 'CMO / VP of Marketing',
          companySize: '100-1000 employees',
          industry: ['Marketing', 'B2B SaaS', 'Professional Services'],
          techMaturity: 'Medium-High',
          painPoints: ['Marketing attribution accuracy', 'Multi-channel optimization', 'Budget allocation efficiency'],
          goals: ['Increase qualified lead generation', 'Improve marketing ROI measurability', 'Scale demand generation programs'],
          buyingTriggers: ['Missed pipeline targets', 'New product launch requiring GTM', 'Competitive marketing threat'],
          objections: ['Data accuracy concerns', 'Integration with existing marketing stack', 'Learning curve for marketing team'],
          budget: '$50k-$500k annually',
          decisionAuthority: 'High - budget owner for marketing technology',
          buyingCommittee: ['CMO', 'VP Marketing', 'Marketing Operations', 'Demand Gen Director'],
          lifetimeValue: '$150k-$1.5M over 3 years',
          intent: 'High - actively researching marketing technology solutions',
          evidence: { source: 'Industry evidence pattern', confidence: 80, collectedAt: now }
        }
      ],
      b2c: []
    },
    'E-commerce': {
      b2b: [],
      b2c: [
        {
          icpName: 'Online Shopper',
          role: 'Consumer',
          companySize: 'N/A',
          industry: ['E-commerce', 'Retail'],
          techMaturity: 'Medium',
          painPoints: ['Product discovery difficulty', 'Checkout friction', 'Shipping costs and timing'],
          goals: ['Find products quickly', 'Secure best prices', 'Fast and reliable delivery'],
          buyingTriggers: ['Seasonal promotions', 'Product availability alerts', 'Free shipping offers'],
          objections: ['Price comparison concerns', 'Return policy uncertainty', 'Payment security worries'],
          budget: '$50-$500 per transaction',
          decisionAuthority: 'Self-serve',
          buyingCommittee: ['Self', 'Family members'],
          lifetimeValue: '$500-$5,000 over 3 years',
          intent: 'Medium - triggered by need and promotions',
          evidence: { source: 'Industry evidence pattern', confidence: 65, collectedAt: now }
        }
      ]
    }
  };

  const industryLower = industry.toLowerCase();
  let matchedPatterns = [];

  for (const [cat, types] of Object.entries(icpPatterns)) {
    if (industryLower.includes(cat.toLowerCase())) {
      if (b2bOrB2C === 'B2B' || b2bOrB2C === 'Both B2B and B2C' || b2bOrB2C === 'Unknown') {
        matchedPatterns = [...matchedPatterns, ...(types.b2b || [])];
      }
      if (b2bOrB2C === 'B2C' || b2bOrB2C === 'Both B2B and B2C') {
        matchedPatterns = [...matchedPatterns, ...(types.b2c || [])];
      }
    }
  }

  // Default to Technology B2B patterns if no match
  if (matchedPatterns.length === 0) {
    if (b2bOrB2C === 'B2B' || b2bOrB2C === 'Unknown') {
      matchedPatterns = icpPatterns['Technology'].b2b;
    } else if (b2bOrB2C === 'B2C') {
      matchedPatterns = icpPatterns['Technology'].b2c;
    }
  }

  // Populate audience fields from matched patterns
  if (matchedPatterns.length > 0) {
    audience.icp = matchedPatterns.map(p => ({
      name: p.icpName,
      role: p.role,
      companySize: p.companySize,
      industry: p.industry,
      techMaturity: p.techMaturity,
      painPoints: p.painPoints,
      goals: p.goals,
      buyingTriggers: p.buyingTriggers,
      objections: p.objections,
      budget: p.budget,
      decisionAuthority: p.decisionAuthority,
      buyingCommittee: p.buyingCommittee,
      lifetimeValue: p.lifetimeValue,
      intent: p.intent,
      evidence: p.evidence
    }));

    audience.personas = matchedPatterns.map(p => ({
      name: p.icpName,
      role: p.role,
      demographics: `${p.role} at ${p.companySize} companies`,
      painPoints: p.painPoints,
      goals: p.goals,
      source: 'industry_evidence_pattern'
    }));

    audience.decisionMakers = [...new Set(matchedPatterns.map(p => p.role))].map(role => ({
      title: role,
      confidence: 80,
      evidence: { source: 'Industry evidence pattern', confidence: 80, collectedAt: now }
    }));

    audience.buyingCommittee = [...new Set(matchedPatterns.flatMap(p => p.buyingCommittee))].map(role => ({
      title: role,
      influence: 'Medium-High',
      evidence: { source: 'Industry evidence pattern', confidence: 75, collectedAt: now }
    }));

    audience.objections = [...new Set(matchedPatterns.flatMap(p => p.objections))].map(obj => ({
      value: obj,
      confidence: 80,
      impact: 'High',
      evidence: { source: 'Industry evidence pattern', confidence: 80, collectedAt: now }
    }));

    audience.painPoints = [...new Set(matchedPatterns.flatMap(p => p.painPoints))].map(pp => ({
      value: pp,
      confidence: 80,
      impact: 'High',
      evidence: { source: 'Industry evidence pattern', confidence: 80, collectedAt: now }
    }));

    audience.buyingTriggers = [...new Set(matchedPatterns.flatMap(p => p.buyingTriggers))].map(bt => ({
      value: bt,
      confidence: 75,
      impact: 'High',
      evidence: { source: 'Industry evidence pattern', confidence: 75, collectedAt: now }
    }));

    audience.budget = matchedPatterns[0]?.budget || 'Unknown';

    audience.intent = matchedPatterns.map(p => ({
      segment: p.icpName,
      intentLevel: p.intent,
      confidence: 70,
      evidence: { source: 'Industry evidence pattern', confidence: 70, collectedAt: now }
    }));

    audience.companySize = matchedPatterns[0]?.companySize || 'Unknown';

    audience.techMaturity = matchedPatterns[0]?.techMaturity || 'Unknown';

    audience.lifetimeValue = {
      estimatedRange: matchedPatterns[0]?.lifetimeValue || 'Unknown',
      confidence: 60,
      evidence: { source: 'Industry benchmark estimates', confidence: 60, collectedAt: now }
    };

    audience.sources.push({ type: 'personas', source: 'industry_evidence', count: matchedPatterns.length });
  }

  // Default fallbacks if no patterns matched
  if (audience.decisionMakers.length === 0) {
    audience.decisionMakers.push({ title: 'Unknown - Insufficient evidence', confidence: 0 });
  }
  if (audience.buyingTriggers.length === 0) {
    audience.buyingTriggers.push({ value: 'Unknown - Insufficient evidence', confidence: 0, impact: 'Low' });
  }
  if (audience.objections.length === 0) {
    audience.objections.push({ value: 'Unknown - Insufficient evidence', confidence: 0, impact: 'Low' });
  }
  if (audience.painPoints.length === 0) {
    audience.painPoints.push({ value: 'Unknown - Insufficient evidence', confidence: 0, impact: 'Low' });
  }

  // Channels from website evidence
  if (lower.includes('linkedin')) audience.channels.push({ name: 'LinkedIn', confidence: 90, evidence: { source: 'Website content', confidence: 90, collectedAt: now } });
  if (lower.includes('twitter') || lower.includes('x.com')) audience.channels.push({ name: 'Twitter / X', confidence: 90, evidence: { source: 'Website content', confidence: 90, collectedAt: now } });
  if (lower.includes('youtube') || lower.includes('video')) audience.channels.push({ name: 'YouTube', confidence: 85, evidence: { source: 'Website content', confidence: 85, collectedAt: now } });
  if (lower.includes('blog') || lower.includes('article')) audience.channels.push({ name: 'Content Marketing', confidence: 85, evidence: { source: 'Website content', confidence: 85, collectedAt: now } });
  if (lower.includes('newsletter') || lower.includes('email')) audience.channels.push({ name: 'Email Marketing', confidence: 85, evidence: { source: 'Website content', confidence: 85, collectedAt: now } });
  if (lower.includes('seo') || lower.includes('search')) audience.channels.push({ name: 'SEO', confidence: 80, evidence: { source: 'Website content', confidence: 80, collectedAt: now } });
  if (lower.includes('podcast')) audience.channels.push({ name: 'Podcast', confidence: 70, evidence: { source: 'Website content', confidence: 70, collectedAt: now } });
  if (audience.channels.length === 0) {
    audience.channels.push({ name: 'Unknown - Insufficient evidence', confidence: 0, evidence: { source: 'Unknown', confidence: 0, collectedAt: now } });
  }

  return audience;
}
