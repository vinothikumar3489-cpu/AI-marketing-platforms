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
  const now = new Date().toISOString();

  // Build personas from evidence only
  const icpPatterns = {
    'Technology': {
      b2b: [
        {
          icpName: 'Technical Decision Maker',
          role: 'CTO / VP of Engineering',
          painPoints: ['Technical scalability limitations', 'Engineering velocity bottlenecks', 'Technology debt accumulation'],
          goals: ['Accelerate product development cycles', 'Improve system reliability and uptime', 'Reduce operational overhead'],
          objections: ['Integration complexity with existing stack', 'Security and compliance concerns', 'Vendor lock-in risk'],
          preferredContent: ['Technical documentation', 'Case studies', 'Architecture guides'],
          evidence: { source: 'industry_evidence_pattern', confidence: 70, collectedAt: now }
        },
        {
          icpName: 'Product Leader',
          role: 'VP of Product / Product Manager',
          painPoints: ['Feature prioritization challenges', 'User feedback management gaps', 'Cross-team coordination friction'],
          goals: ['Ship products faster with higher quality', 'Improve product-market fit', 'Increase user engagement and retention'],
          objections: ['ROI uncertainty for new tools', 'Implementation timeline concerns', 'Team training and adoption requirements'],
          preferredContent: ['Product comparison guides', 'Roadmap planning resources', 'User research insights'],
          evidence: { source: 'industry_evidence_pattern', confidence: 65, collectedAt: now }
        },
        {
          icpName: 'Growth Executive',
          role: 'VP of Growth / CRO',
          painPoints: ['Customer acquisition cost optimization', 'Revenue growth stagnation', 'Marketing ROI measurement'],
          goals: ['Scale revenue predictably', 'Improve conversion rates', 'Expand into new market segments'],
          objections: ['Data accuracy and attribution concerns', 'Integration with existing martech stack', 'Learning curve for team'],
          preferredContent: ['Growth strategy frameworks', 'Benchmark reports', 'Revenue optimization guides'],
          evidence: { source: 'industry_evidence_pattern', confidence: 65, collectedAt: now }
        }
      ],
      b2c: [
        {
          icpName: 'Tech-Savvy Consumer',
          role: 'Individual User',
          painPoints: ['Productivity inefficiency', 'Outdated tools', 'Poor user experience'],
          goals: ['Simplify daily workflows', 'Access premium features', 'Stay current with technology'],
          objections: ['Price sensitivity', 'Privacy concerns', 'Learning curve for new tools'],
          preferredContent: ['Product reviews', 'Tutorial videos', 'Feature comparisons'],
          evidence: { source: 'industry_evidence_pattern', confidence: 55, collectedAt: now }
        }
      ]
    },
    'Marketing': {
      b2b: [
        {
          icpName: 'Marketing Executive',
          role: 'CMO / VP of Marketing',
          painPoints: ['Marketing attribution accuracy', 'Multi-channel optimization', 'Budget allocation efficiency'],
          goals: ['Increase qualified lead generation', 'Improve marketing ROI measurability', 'Scale demand generation programs'],
          objections: ['Data accuracy concerns', 'Integration with existing marketing stack', 'Learning curve for marketing team'],
          preferredContent: ['Marketing ROI guides', 'Channel optimization playbooks', 'Attribution frameworks'],
          evidence: { source: 'industry_evidence_pattern', confidence: 70, collectedAt: now }
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
          painPoints: ['Product discovery difficulty', 'Checkout friction', 'Shipping costs and timing'],
          goals: ['Find products quickly', 'Secure best prices', 'Fast and reliable delivery'],
          objections: ['Price comparison concerns', 'Return policy uncertainty', 'Payment security worries'],
          preferredContent: ['Product comparisons', 'Buying guides', 'Customer reviews'],
          evidence: { source: 'industry_evidence_pattern', confidence: 55, collectedAt: now }
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

  if (matchedPatterns.length === 0) {
    if (b2bOrB2C === 'B2B' || b2bOrB2C === 'Unknown') {
      matchedPatterns = icpPatterns['Technology'].b2b;
    } else if (b2bOrB2C === 'B2C') {
      matchedPatterns = icpPatterns['Technology'].b2c;
    }
  }

  if (matchedPatterns.length > 0) {
    // Evidence-aware confidence: industry patterns are only inference candidates.
    // Confidence scales with how much of the pattern's content is corroborated by the
    // actual website text. With no corroboration, confidence stays low and source is
    // clearly labeled as inference.
    const textWords = lower.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
    const hasWebsiteContent = textWords.length > 20;

    function patternSignalScore(pattern) {
      if (!hasWebsiteContent) return 0;
      const candidates = [
        ...(pattern.painPoints || []),
        ...(pattern.goals || []),
        ...(pattern.preferredContent || []),
        ...(pattern.role || '').split(' '),
      ].map(s => s.toLowerCase());
      const keywordSet = new Set();
      for (const c of candidates) {
        const words = c.replace(/[^a-z0-9\s]/g, ' ').split(/\s+/).filter(w => w.length > 3);
        words.forEach(w => keywordSet.add(w));
      }
      const hits = [...keywordSet].filter(k => lower.includes(k)).length;
      return keywordSet.size === 0 ? 0 : hits / keywordSet.size;
    }

    function patternConfidence(pattern) {
      const ratio = patternSignalScore(pattern);
      return {
        confidence: Math.round(20 + ratio * 35),
        source: ratio > 0.3 ? 'website_evidence + industry pattern' : 'industry_pattern_inferred',
      };
    }

    audience.icp = matchedPatterns.map(p => {
      const conf = patternConfidence(p);
      return {
        name: p.icpName,
        role: p.role,
        painPoints: p.painPoints,
        goals: p.goals,
        objections: p.objections,
        preferredContent: p.preferredContent,
        evidence: { source: conf.source, confidence: conf.confidence, collectedAt: now }
      };
    });

    audience.personas = matchedPatterns.map(p => {
      const conf = patternConfidence(p);
      return {
        name: p.icpName,
        role: p.role,
        painPoints: p.painPoints,
        goals: p.goals,
        objections: p.objections,
        preferredContent: p.preferredContent,
        source: conf.source,
        evidence: { source: conf.source, confidence: conf.confidence, collectedAt: now }
      };
    });

    const avgConfidence = Math.round(matchedPatterns.reduce((acc, p) => acc + patternConfidence(p).confidence, 0) / matchedPatterns.length);

    audience.decisionMakers = [...new Set(matchedPatterns.map(p => p.role))].map(role => ({
      title: role,
      confidence: avgConfidence,
      evidence: { source: avgConfidence < 50 ? 'Industry pattern inference' : 'Website evidence + industry pattern', confidence: avgConfidence, collectedAt: now }
    }));

    audience.buyingCommittee = [...new Set(matchedPatterns.flatMap(p => [p.role]))].map(role => ({
      title: role,
      influence: 'Unknown - Insufficient evidence',
      evidence: { source: 'Industry pattern inference', confidence: Math.min(60, avgConfidence), collectedAt: now }
    }));

    audience.objections = [...new Set(matchedPatterns.flatMap(p => p.objections))].map(obj => ({
      value: obj,
      confidence: Math.min(70, avgConfidence),
      impact: 'Unknown - Insufficient evidence',
      evidence: { source: 'Industry pattern inference', confidence: Math.min(70, avgConfidence), collectedAt: now }
    }));

    audience.painPoints = [...new Set(matchedPatterns.flatMap(p => p.painPoints))].map(pp => ({
      value: pp,
      confidence: Math.min(70, avgConfidence),
      impact: 'Unknown - Insufficient evidence',
      evidence: { source: 'Industry pattern inference', confidence: Math.min(70, avgConfidence), collectedAt: now }
    }));

    audience.buyingTriggers = [...new Set(matchedPatterns.flatMap(p => p.preferredContent || []))].map(bt => ({
      value: bt,
      confidence: Math.min(60, avgConfidence),
      impact: 'Unknown - Insufficient evidence',
      evidence: { source: 'Industry pattern inference', confidence: Math.min(60, avgConfidence), collectedAt: now }
    }));

    audience.budget = null;
    audience.intent = null;
    audience.companySize = null;
    audience.techMaturity = null;
    audience.lifetimeValue = null;

    audience.sources.push({
      type: 'personas',
      source: hasWebsiteContent ? 'website_evidence + industry_pattern' : 'industry_pattern_inferred',
      count: matchedPatterns.length,
      hasWebsiteContent,
    });
  }

  if (audience.personas.length === 0) {
    audience.personas.push({ name: 'Unknown - Insufficient evidence', role: null, painPoints: [], goals: [], objections: [], preferredContent: [], source: 'no_evidence', evidence: { source: 'No website or industry evidence collected', confidence: 0, collectedAt: now } });
    audience.icp = [];
  }

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
