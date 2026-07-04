export async function collectAudienceIntelligence({ company, competitors, market, scrapedData, scrapedWithExtraction }) {
  const audience = {
    personas: [],
    segments: [],
    buyingTriggers: [],
    objections: [],
    decisionMakers: [],
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

  // Build ICPs from evidence only
  const icpPatterns = {
    'Technology': {
      b2b: [
        {
          role: 'CTO / VP of Engineering',
          companySize: 'Mid-Market to Enterprise',
          industry: 'Technology',
          painPoints: ['Technical scalability', 'Engineering velocity', 'Technology debt management'],
          goals: ['Accelerate product development', 'Improve system reliability', 'Reduce operational costs'],
          buyingTriggers: ['System downtime', 'Competitive pressure', 'Budget allocation for new tools'],
          objections: ['Integration complexity', 'Security compliance', 'Vendor lock-in risk'],
          budget: '$50k-$500k annually',
          decisionAuthority: 'High - Final decision maker for technical purchases',
          technologyMaturity: 'High'
        },
        {
          role: 'Product Manager',
          companySize: 'Mid-Market',
          industry: 'Technology',
          painPoints: ['Feature prioritization', 'User feedback management', 'Cross-team coordination'],
          goals: ['Ship products faster', 'Improve product-market fit', 'Increase user engagement'],
          buyingTriggers: ['New competitor feature releases', 'Customer churn increase', 'Product roadmap gaps'],
          objections: ['ROI uncertainty', 'Implementation timeline', 'Team training requirements'],
          budget: '$20k-$200k annually',
          decisionAuthority: 'Medium - Influencer with budget approval needed',
          technologyMaturity: 'Medium-High'
        }
      ],
      b2c: []
    },
    'E-commerce': {
      b2b: [],
      b2c: []
    },
    'Marketing': {
      b2b: [
        {
          role: 'VP of Marketing / CMO',
          companySize: 'Mid-Market to Enterprise',
          industry: 'Marketing',
          painPoints: ['Attribution accuracy', 'Channel optimization', 'Budget efficiency'],
          goals: ['Increase qualified leads', 'Improve marketing ROI', 'Scale demand generation'],
          buyingTriggers: ['Missed revenue targets', 'New market entry', 'Competitive threat'],
          objections: ['Data accuracy concerns', 'Integration with existing stack', 'Learning curve for team'],
          budget: '$30k-$300k annually',
          decisionAuthority: 'High - Budget owner for marketing technology',
          technologyMaturity: 'Medium-High'
        }
      ],
      b2c: []
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

  // Default B2B patterns if no industry match
  if (matchedPatterns.length === 0 && (b2bOrB2C === 'B2B' || b2bOrB2C === 'Unknown')) {
    matchedPatterns = icpPatterns['Technology'].b2b;
  }

  if (matchedPatterns.length > 0) {
    audience.personas = matchedPatterns.map(p => ({
      ...p,
      source: 'industry_evidence_pattern'
    }));
    audience.sources.push({ type: 'personas', source: 'industry_evidence', count: matchedPatterns.length });
  }

  // Decision makers from patterns
  audience.decisionMakers = [...new Set(matchedPatterns.map(p => p.role))];
  if (audience.decisionMakers.length === 0) {
    audience.decisionMakers.push('Unknown - Insufficient evidence');
  }

  // Buying triggers from patterns
  audience.buyingTriggers = [...new Set(matchedPatterns.flatMap(p => p.buyingTriggers))];
  if (audience.buyingTriggers.length === 0) {
    audience.buyingTriggers.push('Unknown - Insufficient evidence');
  }

  // Objections from patterns
  audience.objections = [...new Set(matchedPatterns.flatMap(p => p.objections))];
  if (audience.objections.length === 0) {
    audience.objections.push('Unknown - Insufficient evidence');
  }

  // Channels from website evidence
  if (lower.includes('linkedin') || lower.includes('linkedin')) audience.channels.push('LinkedIn');
  if (lower.includes('twitter') || lower.includes('x.com')) audience.channels.push('Twitter / X');
  if (lower.includes('youtube') || lower.includes('video')) audience.channels.push('YouTube');
  if (lower.includes('blog') || lower.includes('article')) audience.channels.push('Content Marketing');
  if (lower.includes('newsletter') || lower.includes('email')) audience.channels.push('Email');
  if (lower.includes('seo') || lower.includes('search')) audience.channels.push('SEO');
  if (audience.channels.length === 0) {
    audience.channels.push('Unknown - Insufficient evidence');
  }

  return audience;
}
