import { callAI } from '../../ai/services/aiRouter.service.js';
import { validateContentClaims, validateBriefContent } from './claim-validator.service.js';
import { validateContentOutput, repairAIOutput, SCHEMA_REGISTRY } from './content-schemas.js';

const CONTENT_TYPES = {
  blog_article: { label: 'Blog Article' },
  faq_page: { label: 'FAQ Page' },
  landing_page: { label: 'Landing Page' },
  product_page: { label: 'Product Page' },
  comparison_page: { label: 'Comparison Page' },
  feature_announcement: { label: 'Feature Announcement' },
  whitepaper: { label: 'Whitepaper' },
  linkedin_post: { label: 'LinkedIn Post' },
  instagram_post: { label: 'Instagram Post' },
  twitter_post: { label: 'X (Twitter) Post' },
  facebook_post: { label: 'Facebook Post' },
  youtube_description: { label: 'YouTube Description' },
  email_copy: { label: 'Email Copy' },
  creative_brief: { label: 'Creative Brief' },
  video_script: { label: 'Video Script' },
};

export const CONTENT_TYPES_LIST = Object.keys(CONTENT_TYPES);
export { CONTENT_TYPES };

function buildEvidenceSection(brief) {
  const lines = [];
  if (brief.product?.name) lines.push(`Product: ${brief.product.name}`);
  if (brief.product?.brandName) lines.push(`Brand: ${brief.product.brandName}`);
  if (brief.company?.name) lines.push(`Company: ${brief.company.name}`);
  if (brief.product?.summary) lines.push(`Product Summary: ${brief.product.summary}`);
  if (brief.product?.usp) lines.push(`USP: ${brief.product.usp}`);
  if (brief.product?.features?.length) {
    const featureTexts = brief.product.features.map(f => {
      if (typeof f === 'string') return f;
      if (f && typeof f === 'object') {
        const name = f.name || f.feature || f.title || '';
        const desc = f.description || f.details || '';
        const benefit = f.benefit || f.value || '';
        return [name, desc, benefit].filter(Boolean).join(': ');
      }
      return String(f);
    }).filter(Boolean);
    if (featureTexts.length) lines.push(`Features:\n${featureTexts.slice(0, 10).map(f => `  - ${f}`).join('\n')}`);
  }
  if (brief.product?.benefits?.length) {
    const benefitTexts = brief.product.benefits.map(b => {
      if (typeof b === 'string') return b;
      if (b && typeof b === 'object') return b.text || b.description || b.benefit || JSON.stringify(b);
      return String(b);
    }).filter(Boolean);
    if (benefitTexts.length) lines.push(`Benefits:\n${benefitTexts.slice(0, 8).map(b => `  - ${b}`).join('\n')}`);
  }
  if (brief.company?.industry) lines.push(`Industry: ${brief.company.industry}`);
  if (brief.targetPersonas?.length) {
    lines.push(`Target Personas:\n${brief.targetPersonas.slice(0, 5).map(p => {
      const parts = [p.name, p.role].filter(Boolean);
      if (p.painPoints?.length) parts.push(`pain: ${p.painPoints.slice(0, 3).join('; ')}`);
      if (p.goals?.length) parts.push(`goals: ${p.goals.slice(0, 3).join('; ')}`);
      return `  - ${parts.join(' | ')}`;
    }).join('\n')}`);
  }
  if (brief.painPoints?.length) lines.push(`Pain Points:\n${brief.painPoints.slice(0, 6).map(p => `  - ${p}`).join('\n')}`);
  if (brief.objections?.length) lines.push(`Objections:\n${brief.objections.slice(0, 4).map(o => `  - ${o}`).join('\n')}`);
  if (brief.validatedCompetitors?.length) {
    lines.push(`Competitors:\n${brief.validatedCompetitors.slice(0, 5).map(c => {
      const parts = [c.name, c.domain].filter(Boolean);
      if (c.strengths?.length) parts.push(`strengths: ${c.strengths.slice(0, 3).join('; ')}`);
      if (c.weaknesses?.length) parts.push(`weaknesses: ${c.weaknesses.slice(0, 3).join('; ')}`);
      return `  - ${parts.join(' | ')}`;
    }).join('\n')}`);
  }
  if (brief.verifiedKeywords?.length) lines.push(`SEO Keywords:\n${brief.verifiedKeywords.slice(0, 15).map(k => {
    const parts = [k.keyword];
    if (k.volume) parts.push(`vol: ${k.volume}`);
    if (k.difficulty) parts.push(`diff: ${k.difficulty}`);
    if (k.intent) parts.push(`intent: ${k.intent}`);
    return `  - ${parts.join(' | ')}`;
  }).join('\n')}`);
  if (brief.topicIdeas?.length) lines.push(`Topic Ideas:\n${brief.topicIdeas.slice(0, 5).map(t => `  - ${t.topic || t}`).join('\n')}`);
  if (brief.contentGaps?.length) lines.push(`Content Gaps:\n${brief.contentGaps.slice(0, 4).map(g => `  - ${g.gap || g}`).join('\n')}`);
  if (brief.tone) lines.push(`Tone: ${brief.tone}`);
  if (brief.CTA?.length) lines.push(`CTA:\n${brief.CTA.slice(0, 3).map(c => `  - ${c.text || c}`).join('\n')}`);
  if (brief.limitations?.length) lines.push(`Limitations:\n${brief.limitations.slice(0, 3).map(l => `  - ${l}`).join('\n')}`);
  return `\n${lines.join('\n')}\n`;
}

function getFirstFeature(brief) { return brief.product?.features?.[0] ? (typeof brief.product.features[0] === 'object' ? brief.product.features[0].name || brief.product.features[0].feature || brief.product.features[0].title || 'key feature' : brief.product.features[0]) : 'key feature'; }

function getFirstBenefit(brief) { return brief.product?.benefits?.[0] ? (typeof brief.product.benefits[0] === 'object' ? brief.product.benefits[0].text || brief.product.benefits[0].benefit || 'value' : brief.product.benefits[0]) : 'valuable outcomes'; }

function getFirstPainPoint(brief) { return brief.painPoints?.[0] || brief.targetPersonas?.[0]?.painPoints?.[0] || 'common challenges'; }

function getProductName(brief) { return brief.product?.name || brief.product?.brandName || brief.company?.name || 'this solution'; }

function getPersonaName(brief) { return brief.targetPersonas?.[0]?.name || brief.targetPersonas?.[0]?.role || 'users'; }

function getKeyword(brief, idx) { return brief.verifiedKeywords?.[idx]?.keyword || brief.verifiedKeywords?.[idx] || ''; }

function buildProductEvidenceContext(brief) {
  const product = brief.product || {};
  const company = brief.company || {};
  const personas = brief.targetPersonas || [];
  const persona = personas[0] || {};
  const keywords = (brief.verifiedKeywords || []).slice(0, 10);
  return `PRODUCT CONTEXT:
Identity: ${product.name || company.name || 'Unknown'}
Summary: ${product.summary || 'N/A'}
USP: ${product.usp || 'N/A'}
Features: ${(product.features || []).slice(0, 6).map(f => typeof f === 'string' ? f : f.name || f.feature || f).filter(Boolean).join(', ') || 'N/A'}
Benefits: ${(product.benefits || []).slice(0, 6).map(b => typeof b === 'string' ? b : b.text || b.benefit || b.description || b).filter(Boolean).join(', ') || 'N/A'}
Industry: ${company.industry || 'N/A'}
Target Persona: ${persona.name || persona.role || 'N/A'}
Pain Points: ${(persona.painPoints || brief.painPoints || []).slice(0, 5).join('; ') || 'N/A'}
SEO Keywords: ${keywords.map(k => k.keyword).filter(Boolean).join(', ') || 'N/A'}
Competitors: ${(brief.validatedCompetitors || []).slice(0, 5).map(c => c.name).filter(Boolean).join(', ') || 'N/A'}
Tone: ${brief.tone || 'professional'}
Missing evidence: ${(brief.limitations || []).join('; ') || 'None identified'}`;
}

const RULE_BASED_FALLBACKS = {
  linkedin_post(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const feature = getFirstFeature(brief);
    return {
      hook: `Stop struggling with ${pain}.`,
      body: `Many ${persona} face this challenge daily — but ${name} makes it simpler.\n\nWith ${feature}, you can move faster and achieve better results.\n\nBuilt for ${persona} who want to stop wasting time and start seeing real outcomes.`,
      cta: `Try ${name} today`,
      hashtags: ['#Productivity', '#Innovation', '#Marketing'],
      audience: persona,
      angle: 'content research',
      evidenceUsed: ['product_features', 'audience_pain_points'],
      claimsRequiringReview: []
    };
  },
  instagram_post(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const benefit = getFirstBenefit(brief);
    return {
      _type: 'instagram_post',
      hook: `Your ${persona} deserve better than ${pain}.`,
      caption: `${name} helps ${persona} unlock ${benefit}.\n\nStop settling for outdated approaches. Start with a tool built for real results.\n\nTap the link to learn more.`,
      cta: 'Link in bio',
      hashtags: ['#WorkSmarter', '#MarketingTips', '#Growth'],
      visualConcept: `${persona} using ${name} on a laptop showing ${benefit}`,
      audience: persona,
      angle: 'visual storytelling',
      evidenceUsed: ['audience_pain_points', 'product_benefits'],
      claimsRequiringReview: []
    };
  },
  twitter_post(brief) {
    const name = getProductName(brief);
    const pain = getFirstPainPoint(brief);
    const persona = getPersonaName(brief);
    const keyword = getKeyword(brief, 0) || pain.toLowerCase().replace(/\s+/g, '');
    const post = `${pain} slowing you down?\n\n${name} helps you ${getFirstBenefit(brief)} — so you can focus on what matters.\n\n${keyword}`;
    return {
      _type: 'twitter_post',
      post: post.length > 280 ? post.substring(0, 277) + '...' : post,
      cta: null,
      hashtags: ['#Productivity', '#Marketing'],
      angle: 'quick insight',
      audience: persona,
      evidenceUsed: ['audience_pain_points'],
      claimsRequiringReview: []
    };
  },
  facebook_post(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const feature = getFirstFeature(brief);
    return {
      _type: 'facebook_post',
      headline: `Say goodbye to ${pain}`,
      body: `${name} gives ${persona} the ${feature} they need to achieve ${getFirstBenefit(brief)}.\n\nBuilt by professionals, for professionals.`,
      cta: 'Learn More',
      audience: persona,
      angle: 'solution highlighting',
      evidenceUsed: ['product_features', 'audience_pain_points'],
      claimsRequiringReview: []
    };
  },
  youtube_description(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const keyword1 = getKeyword(brief, 0) || 'marketing';
    const keyword2 = getKeyword(brief, 1) || 'productivity';
    return {
      _type: 'youtube_description',
      title: `How ${name} Helps ${persona} ${getFirstBenefit(brief)}`,
      description: `In this video, we explore how ${name} solves ${getFirstPainPoint(brief)} for ${persona}.\n\nKey topics covered:\n- Understanding the ${keyword1} landscape\n- How ${name} fits into your ${keyword2} strategy\n- Practical tips to get started today`,
      openingHook: `${getFirstPainPoint(brief)} slowing down your team? Here's how ${name} can help.`,
      chapters: [
        { timestamp: '0:00', title: 'Introduction' },
        { timestamp: '1:30', title: 'The Problem' },
        { timestamp: '3:00', title: 'How It Works' },
        { timestamp: '5:00', title: 'Getting Started' }
      ],
      links: [],
      cta: 'Visit our website to learn more',
      hashtags: ['#' + keyword1.replace(/\s+/g, ''), '#' + keyword2.replace(/\s+/g, ''), '#' + name.replace(/\s+/g, '')],
      keywords: [keyword1, keyword2, name],
      evidenceUsed: ['product_features', 'audience_pain_points'],
      claimsRequiringReview: []
    };
  },
  email_copy(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const benefit = getFirstBenefit(brief);
    return {
      _type: 'email_copy',
      emailType: 'outreach',
      subject: `How ${name} helps ${persona} overcome ${pain}`,
      previewText: `Discover what ${name} can do for you.`,
      greeting: `Hi there,`,
      opening: `We know ${pain} is a real challenge for ${persona}. That's why we built ${name}.`,
      bodyParagraphs: [
        `${name} delivers ${benefit} through a simple, intuitive approach.`,
        `Our users consistently report saving time and achieving better outcomes.`,
        `See for yourself how ${name} can transform your workflow.`
      ],
      bulletPoints: [
        `${getFirstFeature(brief)} to drive results`,
        `Designed specifically for ${persona}`,
        `Proven approach backed by real evidence`
      ],
      ctaText: `Try ${name}`,
      ctaUrl: null,
      closing: `Ready to get started?`,
      signature: `The ${name} Team`,
      personalizationFields: [],
      complianceNote: null,
      evidenceUsed: ['product_features', 'audience_pain_points', 'product_benefits'],
      claimsRequiringReview: []
    };
  },
  creative_brief(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const feature = getFirstFeature(brief);
    return {
      _type: 'creative_brief',
      objective: `Show how ${name} solves ${pain} for ${persona}`,
      audience: persona,
      message: `${name} helps ${persona} achieve ${getFirstBenefit(brief)}`,
      visualDirection: `Professional product-focused imagery showing ${feature}`,
      brandSignals: [name, brief.product?.brandName || name, brief.company?.industry || 'technology'].filter(Boolean),
      requiredText: `${name}: ${getFirstBenefit(brief)} for ${persona}`,
      cta: `Try ${name} today`,
      format: 'Multi-channel campaign',
      evidenceLimitations: [],
      evidenceUsed: ['product_features', 'audience_pain_points', 'product_benefits'],
      claimsRequiringReview: []
    };
  },
  video_script(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const feature = getFirstFeature(brief);
    return {
      _type: 'video_script',
      title: `Introducing ${name} for ${persona}`,
      format: 'Explainer',
      duration: '60-90 seconds',
      scenes: [
        {
          scene: 1,
          narration: `Many ${persona} struggle with ${pain}. It's time-consuming, frustrating, and holds you back.`,
          onScreenText: `The ${pain} problem`,
          visual: `${persona} looking frustrated at a cluttered screen`,
          evidencePoint: brief.painPoints?.[0] || 'audience pain points',
          cta: null
        },
        {
          scene: 2,
          narration: `That's where ${name} comes in. We built ${feature} to help you ${getFirstBenefit(brief)}.`,
          onScreenText: `${name}: ${getFirstBenefit(brief)}`,
          visual: `Clean interface showing ${name} ${feature}`,
          evidencePoint: brief.product?.features?.[0] ? 'product feature: ' + (typeof brief.product.features[0] === 'object' ? brief.product.features[0].name || brief.product.features[0].feature : brief.product.features[0]) : 'product evidence',
          cta: null
        },
        {
          scene: 3,
          narration: `Ready to get started? Visit our website and see the difference ${name} can make.`,
          onScreenText: `Start with ${name} today`,
          visual: `${name} logo and website URL`,
          evidencePoint: null,
          cta: `Visit ${name} website`
        }
      ],
      evidenceUsed: ['product_features', 'audience_pain_points'],
      limitations: []
    };
  },
  blog_article(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const feature = getFirstFeature(brief);
    const kw = getKeyword(brief, 0) || pain.toLowerCase().replace(/\s+/g, '-');
    return {
      _type: 'blog_article',
      headline: `How ${name} Helps ${persona} Overcome ${pain}`,
      metaDescription: `Learn how ${name} helps ${persona} solve ${pain} with ${feature}.`,
      introduction: `${pain} is a common challenge for ${persona}. In this article, we explore how ${name} provides a practical solution.`,
      sections: [
        {
          heading: 'Understanding the Challenge',
          body: `Many ${persona} face ${pain} on a daily basis. This affects productivity, outcomes, and overall satisfaction.`,
          keyTakeaways: [`${pain} is more common than you think`, `Traditional approaches fall short`, `A better solution exists`]
        },
        {
          heading: `How ${name} Solves This`,
          body: `${name} addresses ${pain} through ${feature}, enabling ${persona} to achieve ${getFirstBenefit(brief)}.`,
          keyTakeaways: [`${feature} directly targets the root cause`, 'Proven methodology', 'Easy to implement']
        },
        {
          heading: 'Getting Started',
          body: `Ready to see ${name} in action? Start your journey today.`,
          keyTakeaways: [`Quick setup process`, `No complex configuration needed`, `Immediate results`]
        }
      ],
      conclusion: `${name} provides a powerful solution for ${persona} dealing with ${pain}. With ${feature}, you can finally achieve ${getFirstBenefit(brief)}.`,
      cta: `Learn more about ${name}`,
      targetKeywords: [kw, name]
    };
  },
  faq_page(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const feature = getFirstFeature(brief);
    const benefit = getFirstBenefit(brief);
    return {
      headline: `Frequently Asked Questions About ${name}`,
      metaDescription: `Find answers to common questions about ${name} and how it helps ${persona}.`,
      introduction: `Here are answers to the most common questions about ${name}.`,
      faqs: [
        {
          question: `What is ${name}?`,
          answer: `${name} is a solution designed to help ${persona} achieve ${benefit}. It provides ${feature} in a simple, effective package.`
        },
        {
          question: `Who is ${name} for?`,
          answer: `${name} is built for ${persona} who need ${benefit}. If you're dealing with ${getFirstPainPoint(brief)}, ${name} can help.`
        },
        {
          question: `How does ${name} work?`,
          answer: `${name} uses ${feature} to deliver ${benefit}. It's designed to be intuitive and requires no special training.`
        },
        {
          question: `How do I get started with ${name}?`,
          answer: `Getting started is simple. Visit our website, sign up, and start seeing results immediately.`
        }
      ],
      cta: `Try ${name} today`
    };
  },
  landing_page(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const benefit = getFirstBenefit(brief);
    const feature = getFirstFeature(brief);
    const kw = getKeyword(brief, 0) || name;
    return {
      headline: `${name}: ${benefit} for ${persona}`,
      subheadline: `Stop struggling with ${pain}. Start seeing results.`,
      heroCTA: `Get Started with ${name}`,
      painPoints: [
        `${pain} slowing you down`,
        `Traditional tools don't deliver`,
        `Wasted time on ${pain.toLowerCase()}`
      ],
      solution: `${name} provides ${feature} that helps ${persona} achieve ${benefit}.`,
      features: [
        { icon: '🎯', title: feature, description: `Targeted ${feature} designed for ${persona}` },
        { icon: '⚡', title: 'Fast Results', description: `See ${benefit} from day one` },
        { icon: '🔒', title: 'Reliable', description: `Built on proven ${getKeyword(brief, 1) || 'methodology'}` }
      ],
      socialProof: [],
      finalCTA: `Start with ${name}`,
      seoKeywords: [kw, `${name} for ${persona}`, `${kw} tool`]
    };
  },
  product_page(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const benefit = getFirstBenefit(brief);
    const feature = getFirstFeature(brief);
    const pain = getFirstPainPoint(brief);
    return {
      productName: name,
      tagline: `${benefit} for ${persona}`,
      overview: `${name} helps ${persona} achieve ${benefit} by addressing ${pain}.`,
      keyFeatures: [
        {
          name: feature,
          description: `Core ${feature} that drives ${benefit}`,
          benefit: `Enables ${persona} to overcome ${pain}`
        },
        {
          name: 'Easy Integration',
          description: 'Works with your existing workflow',
          benefit: 'No disruption to your current process'
        },
        {
          name: 'Real Results',
          description: `Proven approach to ${benefit.toLowerCase()}`,
          benefit: `See ${benefit} quickly`
        }
      ],
      useCases: [
        {
          scenario: `For ${persona} dealing with ${pain}`,
          solution: `${name} provides ${feature} to directly address this challenge`,
          outcome: `Achieve ${benefit} without the usual friction`
        }
      ],
      cta: `Get ${name}`,
      pricing: null,
      faqs: [
        { question: `What makes ${name} different?`, answer: `${name} focuses on ${benefit} through ${feature}.` },
        { question: `Is ${name} right for me?`, answer: `If you're a ${persona} dealing with ${pain}, yes.` }
      ]
    };
  },
  comparison_page(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const benefit = getFirstBenefit(brief);
    const feature = getFirstFeature(brief);
    const competitors = brief.validatedCompetitors?.slice(0, 2).map(c => c.name) || ['Alternative solutions'];
    return {
      headline: `${name} vs Alternatives`,
      introduction: `Compare ${name} with other solutions for ${persona}.`,
      comparisonTable: {
        headers: ['Feature', name, ...competitors],
        rows: [
          { feature: benefit, [name]: '✓', [competitors[0] || 'Alternative']: 'Limited', [competitors[1] || 'Other']: '✗' },
          { feature: feature, [name]: '✓ Native', [competitors[0] || 'Alternative']: '✓ Basic', [competitors[1] || 'Other']: '✗' },
          { feature: 'Ease of Use', [name]: 'High', [competitors[0] || 'Alternative']: 'Medium', [competitors[1] || 'Other']: 'Low' }
        ]
      },
      whyChooseUs: `${name} is purpose-built for ${persona} who need ${benefit}. Unlike alternatives, ${name} delivers ${feature} without complexity.`,
      cta: `Try ${name}`,
      competitorWeaknesses: competitors.map(c => ({ competitor: c, weakness: `Limited ${benefit.toLowerCase()} capabilities` }))
    };
  },
  feature_announcement(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const feature = getFirstFeature(brief);
    const benefit = getFirstBenefit(brief);
    return {
      headline: `Introducing ${feature} on ${name}`,
      subheadline: `A new way for ${persona} to achieve ${benefit}`,
      body: `We're excited to announce a powerful new ${feature} capability in ${name}. Designed for ${persona}, this feature helps you ${benefit} faster than ever before.`,
      benefits: [
        `${benefit} with less effort`,
        `Purpose-built for ${persona}`,
        `Seamless integration with your workflow`
      ],
      cta: `Explore ${feature}`,
      availability: 'Available now',
      technicalDetails: null
    };
  },
  whitepaper(brief) {
    const name = getProductName(brief);
    const persona = getPersonaName(brief);
    const pain = getFirstPainPoint(brief);
    const benefit = getFirstBenefit(brief);
    const feature = getFirstFeature(brief);
    return {
      title: `${benefit}: A Guide for ${persona}`,
      subtitle: `How ${name} Addresses ${pain} With ${feature}`,
      executiveSummary: `This whitepaper explores how ${name} helps ${persona} overcome ${pain} and achieve ${benefit}. Based on real evidence and proven methodologies.`,
      sections: [
        {
          heading: 'The Challenge',
          body: `${persona} face ${pain} daily, impacting their ability to achieve ${benefit.toLowerCase()}. Traditional approaches are failing.`,
          keyFindings: [`${pain} affects productivity`, 'Current tools are inadequate', 'A new approach is needed']
        },
        {
          heading: `The ${name} Solution`,
          body: `${name} addresses these challenges through ${feature}, delivering ${benefit} to ${persona}.`,
          keyFindings: [`${feature} directly solves the core issue`, `Designed specifically for ${persona}`, 'Proven methodology']
        },
        {
          heading: 'Implementation Guide',
          body: `Getting started with ${name} is straightforward. This section covers the implementation approach.`,
          keyFindings: ['Quick setup', 'Minimal learning curve', 'Immediate value']
        }
      ],
      conclusion: `${name} provides a proven solution for ${persona} dealing with ${pain}. With ${feature}, achieving ${benefit} is now possible.`,
      references: [],
      cta: `Download the full ${name} whitepaper`
    };
  }
};

function getEvidenceForTrend(brief) {
  const hasTrendKeywords = brief.verifiedKeywords?.some(k => k.keyword && (k.volume || k.difficulty)) || false;
  const hasWebData = brief.evidenceSources?.websiteScrape || false;
  if (!hasTrendKeywords && !hasWebData) {
    return "Current trend data is not connected. This content is based on product and SEO evidence.";
  }
  return null;
}

async function generateLinkedInPost(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const usp = brief.product?.usp || '';
  const trendNote = getEvidenceForTrend(brief);

  const prompt = `You are a LinkedIn content strategist writing a post for ${productName}.

Write a professional LinkedIn post that resonates with ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- hook: A strong opening statement or question that stops the scroll. Must reference the pain point "${painPoint}" or USP "${usp}". Max 200 chars.
- body: 2-4 short paragraphs. Professional, thought-leadership tone. Reference specific capabilities of ${productName} from evidence.
- cta: A clear product-specific CTA or null. Not generic like "Learn more".
- hashtags: Max 3 relevant hashtags. No hashtags in the body text. Product/industry-specific.
- audience: Who this post targets. Must match one of the personas from evidence.
- angle: One specific angle from: early trend detection, competitor monitoring, creator discovery, content research, ad research, short-form campaign planning, platform comparison, trend saturation avoidance.
- Do NOT include: "In today's world", fake stats, testimonials, awards, ROI claims, pricing, competitor bashing, superlatives (best, ultimate, #1, leading).
${trendNote ? `\nNOTE: ${trendNote}` : ''}

Return valid JSON:
{
  "hook": "string — strong opening, max 200 chars",
  "body": "string — 2-4 short paragraphs",
  "cta": "string or null — product-specific",
  "hashtags": ["max", "3", "hashtags"],
  "audience": "string — persona name from evidence",
  "angle": "string — one specific angle",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": ["any unverifiable claims"]
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.linkedin_post(brief), _provider: 'rule-based' };
}

async function generateInstagramPost(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const trendNote = getEvidenceForTrend(brief);

  const prompt = `You are an Instagram content creator writing a post for ${productName}.

Write an Instagram caption that engages ${persona} who deal with "${painPoint}".

${productContext}

REQUIREMENTS:
- hook: A short attention-grabbing opening line. Max 100 chars.
- caption: 3-5 lines of engaging caption text. Conversational tone. Reference product evidence naturally.
- cta: Short call to action like "Link in bio" or "Visit our website".
- hashtags: Max 10 relevant, product-specific hashtags.
- visualConcept: Describe the visual that should accompany this post.
- audience: Who this targets from evidence.
- angle: Specific angle used.
- Do NOT use: fake stats, testimonials, awards, ROI claims, "stay ahead of the curve", "go viral".
${trendNote ? `\nNOTE: ${trendNote}` : ''}

Return valid JSON:
{
  "hook": "string — max 100 chars",
  "caption": "string — 3-5 lines",
  "cta": "string — short CTA",
  "hashtags": ["string"],
  "visualConcept": "string — describe the visual",
  "audience": "string",
  "angle": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.instagram_post(brief), _provider: 'rule-based' };
}

async function generateTwitterPost(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing an X (Twitter) post for ${productName}.

Write a post that resonates with ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- post: Max 280 characters total including hashtags. Concise, impactful. One clear message.
- hashtags: Max 2 hashtags.
- audience: Who this targets from evidence.
- angle: The specific angle used.
- Do NOT use: fake stats, testimonials, superlatives.
- Must be under 280 chars total.

Return valid JSON:
{
  "post": "string — max 280 chars total",
  "cta": "string or null",
  "hashtags": ["max", "2"],
  "audience": "string",
  "angle": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.twitter_post(brief), _provider: 'rule-based' };
}

async function generateFacebookPost(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const usp = brief.product?.usp || '';

  const prompt = `You are writing a Facebook post for ${productName}.

Write an engaging post for ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- headline: A clear, benefit-driven headline. Max 150 chars.
- body: 2-3 short paragraphs. Conversational, slightly more explanatory than Instagram.
- cta: A clear CTA.
- audience: Who this targets from evidence.
- angle: The messaging angle used.
- Do NOT use: fake stats, testimonials, superlatives, competitor bashing, fake engagement claims.

Return valid JSON:
{
  "headline": "string — max 150 chars",
  "body": "string — 2-3 short paragraphs",
  "cta": "string",
  "audience": "string",
  "angle": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.facebook_post(brief), _provider: 'rule-based' };
}

async function generateYouTubeDescription(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a YouTube video description for ${productName}.

${productContext}

REQUIREMENTS:
- title: Clickable video title. Include relevant SEO keyword if available.
- description: 4-6 line video description. Include key topics covered. Ready to paste into YouTube.
- openingHook: A compelling hook sentence for the video intro.
- chapters: Array of timestamped chapters [{timestamp, title}]. Max 5. Use realistic timestamps. Set to [] if no timing supplied.
- links: Empty array — do not invent URLs.
- cta: A clear call to action.
- hashtags: Max 4 relevant hashtags.
- keywords: 3-5 video keywords, product-specific.
- Do NOT: invent URLs, fake stats, testimonials, superlatives.

Return valid JSON:
{
  "title": "string",
  "description": "string — 4-6 lines",
  "openingHook": "string",
  "chapters": [{"timestamp": "string", "title": "string"}],
  "links": [],
  "cta": "string",
  "hashtags": ["string"],
  "keywords": ["string"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.youtube_description(brief), _provider: 'rule-based' };
}

async function generateEmailCopy(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a professional email for ${productName}.

Write a send-ready email targeting ${persona} who face "${painPoint}".

${productContext}

REQUIREMENTS:
- emailType: One of "outreach", "nurture", "product_announcement", "newsletter", "follow_up", "trial_conversion".
- subject: Compelling subject line. Max 70 chars.
- previewText: Preview/snippet text. Max 150 chars.
- greeting: Professional greeting (e.g., "Hi {{firstName}},").
- opening: Strong opening paragraph addressing the pain point.
- bodyParagraphs: 2-3 short paragraphs about ${productName}.
- bulletPoints: 3 key benefits or features as bullet points.
- ctaText: Clear CTA text.
- ctaUrl: null — do not invent URLs.
- closing: Closing paragraph.
- signature: Sender signature.
- personalizationFields: Array of personalization field names (e.g., ["firstName", "companyName"]).
- complianceNote: For cold outreach, include "This email is a business development inquiry. If you'd prefer not to receive further communications, please reply UNSUBSCRIBE."
- Do NOT use: fake stats, testimonials, ROI claims, pricing, fake urgency.

Return valid JSON:
{
  "emailType": "string — one of the allowed types",
  "subject": "string — max 70 chars",
  "previewText": "string — max 150 chars",
  "greeting": "string",
  "opening": "string",
  "bodyParagraphs": ["string"],
  "bulletPoints": ["string"],
  "ctaText": "string",
  "ctaUrl": null,
  "closing": "string",
  "signature": "string",
  "personalizationFields": ["string"],
  "complianceNote": "string or null",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.email_copy(brief), _provider: 'rule-based' };
}

async function generateBlogArticle(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);
  const keyword = getKeyword(brief, 0) || painPoint.toLowerCase().replace(/\s+/g, '-');

  const prompt = `You are writing a blog article for ${productName}.

Write an informative blog post for ${persona} dealing with "${painPoint}".

${productContext}

REQUIREMENTS:
- headline: SEO-friendly headline including target keyword "${keyword}" if natural. Max 70 chars.
- metaDescription: Compelling meta description. Max 160 chars.
- introduction: Engaging intro paragraph addressing the pain point.
- sections: Array of {heading, body, keyTakeaways}. 2-4 sections. Each section should reference evidence.
- conclusion: Strong conclusion with CTA.
- cta: A clear call to action. Product-specific.
- targetKeywords: Array of 2-3 target keywords.
- Do NOT use: fake stats, testimonials, superlatives, invented data, "revolutionary".

Return valid JSON:
{
  "headline": "string",
  "metaDescription": "string — max 160 chars",
  "introduction": "string",
  "sections": [{"heading": "string", "body": "string", "keyTakeaways": ["string"]}],
  "conclusion": "string",
  "cta": "string",
  "targetKeywords": ["string"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.blog_article(brief), _provider: 'rule-based' };
}

async function generateFAQ(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);

  const prompt = `You are writing an FAQ page for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Clear FAQ page title including product name.
- metaDescription: SEO meta description. Max 160 chars.
- introduction: Short intro paragraph addressing common questions.
- faqs: Array of {question, answer}. 4-6 FAQs based on evidence. Questions should reflect real customer concerns.
- cta: A clear CTA. Product-specific.
- Do NOT invent: fake questions, pricing, claims not supported by evidence.

Return valid JSON:
{
  "headline": "string",
  "metaDescription": "string — max 160 chars",
  "introduction": "string",
  "faqs": [{"question": "string", "answer": "string"}],
  "cta": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.faq_page(brief), _provider: 'rule-based' };
}

async function generateLandingPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a landing page for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Benefit-driven headline. Max 80 chars. Reference USP if available.
- subheadline: Supporting subheadline. Max 150 chars.
- heroCTA: Primary CTA button text. Product-specific.
- painPoints: Array of 3 pain points from the evidence this page addresses.
- solution: One paragraph describing the solution using evidence.
- features: Array of {icon (emoji), title, description}. 3 features. Use evidence-backed descriptions.
- socialProof: Empty array — do not invent testimonials or stats.
- finalCTA: Closing CTA text.
- seoKeywords: Array of 3 SEO keywords from evidence.
- Do NOT: invent testimonials, fake stats, ROI claims, pricing, superlatives.

Return valid JSON:
{
  "headline": "string",
  "subheadline": "string",
  "heroCTA": "string",
  "painPoints": ["string"],
  "solution": "string",
  "features": [{"icon": "string", "title": "string", "description": "string"}],
  "socialProof": [],
  "finalCTA": "string",
  "seoKeywords": ["string"],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.landing_page(brief), _provider: 'rule-based' };
}

async function generateProductPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a product page for ${productName}.

${productContext}

REQUIREMENTS:
- productName: "${productName}".
- tagline: Short compelling tagline referencing USP if available.
- overview: One paragraph product overview addressing pain point "${painPoint}".
- keyFeatures: Array of {name, description, benefit}. 3 features minimum from evidence.
- useCases: Array of {scenario, solution, outcome}. At least 1 use case relevant to ${persona}.
- cta: Clear CTA. Product-specific.
- pricing: null — do not invent pricing.
- faqs: Array of {question, answer}. 2 FAQs minimum from evidence.
- Do NOT: invent pricing, testimonials, fake data, superlatives.

Return valid JSON:
{
  "productName": "string",
  "tagline": "string",
  "overview": "string",
  "keyFeatures": [{"name": "string", "description": "string", "benefit": "string"}],
  "useCases": [{"scenario": "string", "solution": "string", "outcome": "string"}],
  "cta": "string",
  "pricing": null,
  "faqs": [{"question": "string", "answer": "string"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.product_page(brief), _provider: 'rule-based' };
}

async function generateComparisonPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const competitors = brief.validatedCompetitors?.slice(0, 3).map(c => c.name) || [];

  const prompt = `You are writing a comparison page for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Comparison page title. Include product name and key category.
- introduction: One paragraph intro stating what is being compared.
- comparisonTable: Object with headers (array) and rows (array of objects). Be objective — ${productName} does not need to win every row. Use evidence for claims.
- whyChooseUs: Why someone would choose ${productName} based on evidence. Reference specific features/USPs.
- cta: Clear CTA. Product-specific.
- competitorWeaknesses: Array of {competitor, weakness}. Only include if evidence supports it.
${competitors.length ? `\nCompetitors from evidence: ${competitors.join(', ')}` : '\nNo competitor evidence available — use generic "Alternatives" category.'}
- Do NOT: bash competitors without evidence, make superlative claims, use fake data.

Return valid JSON:
{
  "headline": "string",
  "introduction": "string",
  "comparisonTable": {"headers": ["string"], "rows": [{"feature": "string"}]},
  "whyChooseUs": "string",
  "cta": "string",
  "competitorWeaknesses": [{"competitor": "string", "weakness": "string"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.comparison_page(brief), _provider: 'rule-based' };
}

async function generateFeatureAnnouncement(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const feature = getFirstFeature(brief);

  const prompt = `You are announcing a new feature for ${productName}.

${productContext}

REQUIREMENTS:
- headline: Announcement headline highlighting "${feature}". Include product name.
- subheadline: Supporting subheadline.
- body: 1-2 paragraphs describing the feature and its value for ${persona}. Reference evidence.
- benefits: Array of 3 key benefits from evidence.
- cta: Clear CTA. Product-specific.
- availability: "Available now" or specific timeline if supported by evidence.
- technicalDetails: null unless evidence supports it.
- Do NOT: fake stats, testimonials, superlatives, "game-changing".

Return valid JSON:
{
  "headline": "string",
  "subheadline": "string",
  "body": "string",
  "benefits": ["string"],
  "cta": "string",
  "availability": "string",
  "technicalDetails": null,
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.feature_announcement(brief), _provider: 'rule-based' };
}

async function generateWhitepaper(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a whitepaper outline for ${productName}.

${productContext}

REQUIREMENTS:
- title: Whitepaper title focusing on ${painPoint} and ${productName}.
- subtitle: Supporting subtitle.
- executiveSummary: 2-3 sentence executive summary.
- sections: Array of {heading, body, keyFindings}. 3 sections minimum. Each section grounded in evidence.
- conclusion: Strong conclusion with recommendations.
- references: Empty array — do not invent references.
- cta: Clear CTA. Product-specific.
- Do NOT: invent statistics, references, testimonials, superlatives.

Return valid JSON:
{
  "title": "string",
  "subtitle": "string",
  "executiveSummary": "string",
  "sections": [{"heading": "string", "body": "string", "keyFindings": ["string"]}],
  "conclusion": "string",
  "references": [],
  "cta": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.whitepaper(brief), _provider: 'rule-based' };
}

async function generateCreativeBrief(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are creating a creative brief for ${productName}.

${productContext}

REQUIREMENTS:
- objective: Clear campaign objective focused on solving "${painPoint}" for ${persona}. Specific to ${productName}'s USP.
- audience: Target audience name from evidence.
- message: Single key message that communicates value. Rooted in product evidence.
- visualDirection: Describe the visual creative direction with specific imagery references.
- brandSignals: Array of brand-specific signals or themes (e.g., "minimalist design", "case study blue"). Max 5.
- requiredText: A short required product text or tagline.
- cta: Primary call to action. Product-specific.
- format: Content format (e.g., "Multi-channel campaign", "Social video series", "Email nurture sequence").
- evidenceLimitations: Empty array — do not invent limitations.
- Do NOT: invent budget, timeline beyond evidence, fake testimonials, or generic advice.

Return valid JSON:
{
  "objective": "string — clear campaign objective",
  "audience": "string — target audience name",
  "message": "string — single key message",
  "visualDirection": "string — visual creative direction",
  "brandSignals": ["string"],
  "requiredText": "string — required product text",
  "cta": "string",
  "format": "string",
  "evidenceLimitations": [],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.creative_brief(brief), _provider: 'rule-based' };
}

async function generateVideoScript(brief) {
  const evidence = buildEvidenceSection(brief);
  const productContext = buildProductEvidenceContext(brief);
  const productName = getProductName(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const prompt = `You are writing a video script for ${productName}.

${productContext}

REQUIREMENTS:
- title: Video title. Include product name and target keyword if available.
- format: "Explainer" or "Testimonial" or "Demo".
- duration: Estimated duration like "60-90 seconds".
- scenes: Array of {scene, narration, onScreenText, visual, evidencePoint, cta}. 3-5 scenes.
- Each scene should reference specific evidence from the evidence above.
- scene must start at 1.
- Last scene should include cta.
- Use "evidencePoint" (not "evidence") for the evidence reference field.
- Use "onScreenText" (not "on_screen_text") for on-screen text.
- narration should be speakable, natural dialogue, not formal copy.
- Do NOT: invent testimonials, fake data, unverifiable claims, superlatives.

Return valid JSON:
{
  "title": "string",
  "format": "string",
  "duration": "string",
  "scenes": [{"scene": 1, "narration": "string", "onScreenText": "string or null", "visual": "string", "evidencePoint": "string or null", "cta": "string or null"}],
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": [],
  "limitations": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _provider: result.provider };
  } catch (e) { /* fall through to rule-based */ }
  return { ...RULE_BASED_FALLBACKS.video_script(brief), _provider: 'rule-based' };
}

const GENERATORS = {
  linkedin_post: generateLinkedInPost,
  instagram_post: generateInstagramPost,
  twitter_post: generateTwitterPost,
  facebook_post: generateFacebookPost,
  youtube_description: generateYouTubeDescription,
  email_copy: generateEmailCopy,
  blog_article: generateBlogArticle,
  faq_page: generateFAQ,
  landing_page: generateLandingPage,
  product_page: generateProductPage,
  comparison_page: generateComparisonPage,
  feature_announcement: generateFeatureAnnouncement,
  whitepaper: generateWhitepaper,
  creative_brief: generateCreativeBrief,
  video_script: generateVideoScript,
};

export async function generateContent(assetType, brief, evidenceContext, callAiFn, userId, chatId) {
  const typeConfig = CONTENT_TYPES[assetType];
  if (!typeConfig) throw new Error(`Unknown content type: ${assetType}`);

  const schemaEntry = SCHEMA_REGISTRY[assetType];
  if (!schemaEntry) throw new Error(`No schema registered for: ${assetType}`);

  const generator = GENERATORS[assetType];
  if (!generator) throw new Error(`No generator for: ${assetType}`);

  const briefValidation = validateBriefContent(brief);
  if (briefValidation.status === 'blocked') {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'blocked',
      _reason: briefValidation.issues.join('; '),
      _generatedAt: new Date().toISOString(),
    };
  }

  const result = await generator(brief);

  if (!result) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'generation_failed',
      _generatedAt: new Date().toISOString(),
    };
  }

  let repairedResult = repairAIOutput(result, assetType);
  let schemaValidation = validateContentOutput(repairedResult, assetType);

  if (!schemaValidation.valid) {
    const retryBrief = {
      ...brief,
      _retryInstructions: `Schema validation failed. Errors:\n${schemaValidation.errors.join('\n')}\nReturn valid JSON matching the original schema.`,
    };
    const retryResult = await generator(retryBrief);
    if (retryResult) {
      repairedResult = repairAIOutput(retryResult, assetType);
      schemaValidation = validateContentOutput(repairedResult, assetType);
    }
  }

  if (!schemaValidation.valid) {
    return {
      content: { ...repairedResult, _type: assetType },
      metadata: {
        type: assetType,
        label: typeConfig.label,
        status: 'schema_rejected',
        generatedAt: new Date().toISOString(),
        provider: repairedResult._provider || 'content_studio_ai',
        schemaErrors: schemaValidation.errors,
      },
    };
  }

  const claimValidation = validateContentClaims(result, assetType);

  const validatedContent = {
    ...schemaValidation.data,
    _type: assetType,
  };

  return {
    content: validatedContent,
    metadata: {
      type: assetType,
      label: typeConfig.label,
      generatedAt: new Date().toISOString(),
      provider: result._provider || 'content_studio_ai',
      claimStatus: claimValidation.status,
      claimFindings: claimValidation.findings,
      schemaValid: true,
    },
  };
}

export async function generateContentStudioPlan(typesOrCtx, brief, evidenceContext, callAiFn, userId, chatId) {
  if (typesOrCtx && typeof typesOrCtx === 'object' && !Array.isArray(typesOrCtx)) {
    const execCtx = typesOrCtx;
    const minimalBrief = {
      product: { name: execCtx.productName || 'N/A', summary: null, features: [], benefits: [], usp: execCtx.productUsp || null },
      company: { name: execCtx.companyName || null, websiteUrl: null, industry: execCtx.industry || null },
      targetPersonas: execCtx.targetAudience ? [{ name: execCtx.targetAudience, role: null, painPoints: [], goals: [] }] : [],
      painPoints: [], objections: [], validatedCompetitors: [], verifiedKeywords: [], topicIdeas: [],
      contentGaps: [], tone: execCtx.tone || 'professional', CTA: [], evidenceSources: {}, limitations: [],
      _briefId: `legacy_${Date.now()}`, _chatId: null, _userId: null, _builtAt: new Date().toISOString(),
    };
    const allTypes = Object.keys(CONTENT_TYPES);
    return generateContentStudioPlan(allTypes, minimalBrief, null, null, null, null);
  }

  const types = typesOrCtx;
  const results = [];

  for (const type of types) {
    const genResult = await generateContent(type, brief, evidenceContext, callAiFn, userId, chatId);
    if (genResult) results.push({ type, content: genResult.content || genResult, metadata: genResult.metadata || null });
  }

  return {
    assets: results,
    totalGenerated: results.length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: types,
      provider: 'content_studio',
    },
  };
}

export { generateLinkedInPost, generateInstagramPost, generateTwitterPost, generateFacebookPost, generateYouTubeDescription, generateEmailCopy, generateCreativeBrief, generateVideoScript, generateBlogArticle, generateFAQ, generateLandingPage, generateProductPage, generateComparisonPage, generateFeatureAnnouncement, generateWhitepaper };
