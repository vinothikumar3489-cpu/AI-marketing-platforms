import { callAI } from '../../ai/services/aiRouter.service.js';
import { validateContentClaims, validateBriefContent } from './claim-validator.service.js';
import { validateContentOutput } from './content-schemas.js';

// ================================================
// SCHEMAS — output contracts per content type
// ================================================

const CONTENT_TYPES = {
  blog_article: {
    label: 'Blog Article',
    schema: {
      title: 'string — max 70 chars, product/industry specific',
      purpose: 'string — why this article exists',
      audience: 'string — who it is for from brief personas',
      targetTopic: 'string — from brief verifiedKeywords or topicIdeas',
      searchIntent: 'string — informational / commercial / navigational / transactional',
      outline: 'array of strings — section headings',
      article: 'string — full article body, product/evidence specific',
      metaTitle: 'string — max 60 chars',
      metaDescription: 'string — max 160 chars',
      internalLinkSuggestions: 'array of { text, url } or empty',
      cta: 'string — from brief CTA or product-specific',
      evidenceUsed: 'array of strings — which evidence fields were used',
      claimsRequiringReview: 'array of strings — claims that could not be verified',
    },
  },
  faq_page: {
    label: 'FAQ Page',
    schema: {
      title: 'string',
      purpose: 'string',
      audience: 'string',
      faqItems: 'array of { question, answer } — answers limited to verified product capabilities',
      evidenceUsed: 'array of strings',
      claimsRequiringReview: 'array of strings',
    },
  },
  landing_page: {
    label: 'Landing Page',
    schema: {
      headline: 'string — max 60 chars',
      subHeadline: 'string — max 120 chars',
      problem: 'string — audience problem from brief painPoints',
      solution: 'string — product solution from brief features/usp',
      featureBenefitBlocks: 'array of { feature, benefit, evidence }',
      objectionHandling: 'array of { objection, response } or empty',
      cta: 'string',
      seoMetadata: { metaTitle: 'string', metaDescription: 'string' },
      evidenceUsed: 'array of strings',
    },
  },
  product_page: {
    label: 'Product Page',
    schema: {
      title: 'string',
      purpose: 'string',
      productSummary: 'string — from brief product.summary',
      features: 'array of { feature, benefit, evidence }',
      cta: 'string',
      seoMetadata: { metaTitle: 'string', metaDescription: 'string' },
      evidenceUsed: 'array of strings',
    },
  },
  comparison_page: {
    label: 'Comparison Page',
    schema: {
      title: 'string',
      purpose: 'string',
      primaryProduct: 'string — from brief product.name',
      comparedCompetitors: 'array of { name, domain } — only from brief.validatedCompetitors',
      comparisonFields: 'array of { field, ourValue, competitorValue, source } — source must be evidence, unknown when unavailable',
      cta: 'string',
      evidenceUsed: 'array of strings',
      claimsRequiringReview: 'array of strings',
    },
  },
  feature_announcement: {
    label: 'Feature Announcement',
    schema: {
      title: 'string',
      purpose: 'string',
      featureName: 'string',
      featureDescription: 'string — from brief product.features',
      benefit: 'string',
      availability: 'string — null if unknown, never fabricate dates',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  whitepaper: {
    label: 'Whitepaper',
    schema: {
      title: 'string',
      purpose: 'string',
      audience: 'string',
      executiveSummary: 'string',
      sections: 'array of { heading, content }',
      conclusion: 'string',
      evidenceUsed: 'array of strings',
      limitations: 'array of strings — topics without evidence',
    },
  },
  linkedin_post: {
    label: 'LinkedIn Post',
    schema: {
      text: 'string — max 3000 chars, product/industry specific',
      hook: 'string — first line, max 150 chars',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  instagram_post: {
    label: 'Instagram Post',
    schema: {
      caption: 'string — max 2200 chars',
      hook: 'string — first line, max 125 chars',
      hashtags: 'array of strings — max 5, relevant to product/industry',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  twitter_post: {
    label: 'X (Twitter) Post',
    schema: {
      text: 'string — max 280 chars',
      cta: 'string — optional',
      evidenceUsed: 'array of strings',
    },
  },
  facebook_post: {
    label: 'Facebook Post',
    schema: {
      text: 'string — max 2000 chars',
      hook: 'string',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  youtube_description: {
    label: 'YouTube Description',
    schema: {
      title: 'string — max 70 chars',
      description: 'string — max 5000 chars, product/evidence specific',
      timestamps: 'array of { time, topic } or empty',
      links: 'array of { text, url } or empty',
      cta: 'string',
      evidenceUsed: 'array of strings',
    },
  },
  email_copy: {
    label: 'Email Copy',
    schema: {
      subjectLine: 'string — max 60 chars',
      previewText: 'string — max 100 chars',
      body: 'string — evidence-backed pain point and product value',
      cta: 'string — single CTA',
      personalizationFields: 'array of strings — variables like {{firstName}}',
      evidenceUsed: 'array of strings',
    },
  },
  creative_brief: {
    label: 'Creative Brief',
    schema: {
      objective: 'string — what the creative should achieve',
      audience: 'string — from brief targetPersonas',
      message: 'string — core message from brief USP',
      visualDirection: 'string — reference to product/industry',
      brandSignals: 'array of strings — from brief website.technologyHints or product.features',
      requiredText: 'string — text that must appear (overlaid, not burned in)',
      cta: 'string',
      format: 'string — poster/banner/social/display',
      evidenceLimitations: 'array of strings — what cannot be claimed',
    },
  },
  video_script: {
    label: 'Video Script',
    schema: {
      duration: 'string — 15s / 30s / 60s / 90s',
      scenes: 'array of { scene, narration, onScreenText, visual, evidencePoint, cta }',
      evidenceUsed: 'array of strings',
      limitations: 'array of strings',
    },
  },
};

export const CONTENT_TYPES_LIST = Object.keys(CONTENT_TYPES);
export { CONTENT_TYPES };

// ================================================
// GENERIC PROMPT BUILDER
// ================================================

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
  if (brief.contentGaps?.length) lines.push(`Content Gaps:\n${brief.contentGaps.slice(0, 5).map(g => `  - ${g.topic || g}`).join('\n')}`);
  if (brief.CTA?.length) lines.push(`Available CTAs: ${brief.CTA.join('; ')}`);
  if (brief.limitations?.length) lines.push(`Limitations: ${brief.limitations.join('; ')}`);
  return lines.join('\n');
}

// ================================================
// INDIVIDUAL GENERATORS
// ================================================

async function generateBlogArticle(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const industry = brief.company?.industry || 'the industry';
  const primaryKeyword = brief.verifiedKeywords?.[0]?.keyword || '';
  const keywords = brief.verifiedKeywords?.slice(0, 5).map(k => k.keyword).filter(Boolean).join(', ') || '';
  const painPoint = brief.painPoints?.[0] || '';
  const persona = brief.targetPersonas?.[0]?.name || 'professionals';

  const prompt = `You are a senior content strategist writing for ${productName} in ${industry}.

Write a comprehensive blog article that addresses a specific problem ${persona} face and positions ${productName} as the solution.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Title: Max 70 chars, must include the primary keyword "${primaryKeyword}" naturally
- Target topic: Address the pain point "${painPoint}" specifically
- Article structure: Hook → Problem → Why existing solutions fail → How ${productName} solves it → Specific features with benefits → CTA
- Every feature/benefit claim must trace to the evidence above
- Include 3-5 section headings that flow logically
- Article body: 800-1200 words, written for ${persona}, conversational but authoritative
- Do NOT use: fake statistics, customer testimonials, awards, ROI claims, or pricing
- Do NOT start sentences with "In today's..." or "In the world of..."
- Reference specific product features by name from the evidence
- Meta title: max 60 chars, primary keyword "${primaryKeyword}"
- Meta description: max 160 chars, compelling click-through reason
- CTA: Specific to ${productName}, not generic

Return valid JSON matching this schema:
{
  "title": "string",
  "purpose": "string",
  "audience": "string",
  "targetTopic": "string",
  "searchIntent": "informational",
  "outline": ["section heading 1", "section heading 2", "..."],
  "article": "full article body in markdown",
  "metaTitle": "string",
  "metaDescription": "string",
  "internalLinkSuggestions": [{"text": "anchor text", "url": "suggested path"}],
  "cta": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": ["any unverifiable claims"]
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Blog AI failed:`, e.message); }
  return null;
}

async function generateFAQ(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const persona = brief.targetPersonas?.[0]?.name || 'users';
  const painPoints = brief.painPoints?.slice(0, 4).map(p => `"${p}"`).join(', ') || '';
  const objections = brief.objections?.slice(0, 3).map(o => `"${o}"`).join(', ') || '';
  const features = brief.product?.features?.slice(0, 5).map(f => typeof f === 'string' ? f : f.name || f.description || '').filter(Boolean).join(', ') || '';

  const prompt = `You are a customer success specialist creating an FAQ page for ${productName}.

Write FAQ entries that address real questions ${persona} would ask before purchasing or using ${productName}.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Generate 8-12 FAQ entries
- Questions must come from these categories:
  1. Product capabilities: "What can ${productName} do?" style questions
  2. Pain point resolution: Questions related to ${painPoints}
  3. Objection handling: Address concerns like ${objections}
  4. How-it-works: "How does ${productName} work?" style questions
  5. Feature-specific: Questions about ${features}
- Each answer must be 2-4 sentences, specific to ${productName}
- Use "Information not available" for questions you cannot answer from evidence
- Do NOT invent features, pricing, or capabilities not in evidence
- Title should be product-specific: "${productName} FAQ" or "Frequently Asked Questions About ${productName}"

Return valid JSON:
{
  "title": "string",
  "purpose": "string",
  "audience": "string",
  "faqItems": [{"question": "specific to ${productName}", "answer": "evidence-backed, 2-4 sentences"}],
  "evidenceUsed": [],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] FAQ AI failed:`, e.message); }
  return null;
}

async function generateLandingPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const usp = brief.product?.usp || '';
  const painPoint = brief.painPoints?.[0] || '';
  const persona = brief.targetPersonas?.[0]?.name || 'professionals';
  const feature1 = brief.product?.features?.[0];
  const featureName = typeof feature1 === 'string' ? feature1 : feature1?.name || '';

  const prompt = `You are a conversion copywriter creating a landing page for ${productName}.

The landing page must convert ${persona} who struggle with "${painPoint}" into signups/trials.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Headline: Max 60 chars. Must communicate the core value proposition. Reference "${featureName}" or the USP directly.
- Sub-headline: Max 120 chars. Expand on the headline with a specific benefit.
- Problem section: Describe the pain point "${painPoint}" in detail — make the reader feel understood
- Solution section: Position ${productName} as the specific solution, referencing actual features
- Feature-benefit blocks: For each of the top 3-4 features from evidence, create a block with:
  - feature: The actual feature name from evidence
  - benefit: What it does for the user (from evidence, not invented)
  - evidence: Which evidence field supports this claim
- Objection handling: Address 2-3 real objections from the evidence
- CTA: Single, clear call-to-action. Product-specific, not "Learn More" or "Get Started" alone.
- SEO metadata: title max 60 chars, description max 160 chars
- Do NOT use: fake statistics, customer logos, testimonials, pricing, or comparison claims

Return valid JSON:
{
  "headline": "max 60 chars",
  "subHeadline": "max 120 chars",
  "problem": "detailed pain point description",
  "solution": "how ${productName} solves it specifically",
  "featureBenefitBlocks": [{"feature": "from evidence", "benefit": "from evidence", "evidence": "field name"}],
  "objectionHandling": [{"objection": "from evidence", "response": "from verified capabilities"}],
  "cta": "product-specific CTA",
  "seoMetadata": {"metaTitle": "max 60 chars", "metaDescription": "max 160 chars"},
  "evidenceUsed": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Landing page AI failed:`, e.message); }
  return null;
}

async function generateProductPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const brandName = brief.product?.brandName || '';
  const summary = brief.product?.summary || '';
  const usp = brief.product?.usp || '';

  const prompt = `You are a product marketing manager writing the product detail page for ${productName}${brandName ? ` by ${brandName}` : ''}.

This page is for users who are already considering ${productName} and need detailed feature information to make a decision.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Title: "${productName}" — keep it clean and product-specific
- Product summary: Rewrite the evidence summary to be compelling and specific (2-3 sentences)
- Feature blocks: For each feature from evidence, create a block with:
  - feature: Feature name exactly as in evidence
  - benefit: User benefit (from evidence, not invented)
  - evidence: Which evidence field supports this
- CTA: Product-specific, actionable
- SEO metadata: Title max 60 chars with product name, description max 160 chars
- Do NOT invent pricing, awards, statistics, or capabilities not in evidence
- Do NOT compare to competitors — this is a standalone product page

Return valid JSON:
{
  "title": "string",
  "purpose": "string",
  "productSummary": "compelling 2-3 sentence summary from evidence",
  "features": [{"feature": "from evidence", "benefit": "from evidence", "evidence": "field name"}],
  "cta": "string",
  "seoMetadata": {"metaTitle": "string", "metaDescription": "string"},
  "evidenceUsed": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Product page AI failed:`, e.message); }
  return null;
}

async function generateComparisonPage(brief) {
  const evidence = buildEvidenceSection(brief);
  const competitors = brief.validatedCompetitors || [];
  const names = competitors.map(c => c.name).filter(Boolean).join(', ');
  const productName = brief.product?.name || 'Product';

  if (!names) return {
    title: `${productName} Comparison`,
    purpose: 'No validated competitors available for comparison',
    primaryProduct: productName,
    comparedCompetitors: [],
    comparisonFields: [],
    cta: brief.CTA?.[0] || 'Learn more',
    evidenceUsed: [],
    claimsRequiringReview: ['No validated competitors — comparison not possible'],
  };

  const competitorDetails = competitors.slice(0, 4).map(c => {
    const parts = [c.name];
    if (c.strengths?.length) parts.push(`strengths: ${c.strengths.slice(0, 3).join('; ')}`);
    if (c.weaknesses?.length) parts.push(`weaknesses: ${c.weaknesses.slice(0, 3).join('; ')}`);
    return parts.join(' | ');
  }).join('\n');

  const prompt = `You are a product analyst writing an honest comparison page for ${productName}.

Compare ${productName} against these specific competitors:
${competitorDetails}

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Title: "${productName} vs [Competitor]" or "${productName} Comparison"
- Only compare the competitors listed above — NEVER invent competitor data
- For each comparison field:
  - field: The feature/attribute being compared
  - ourValue: What evidence says about ${productName} (or "Unknown" if not in evidence)
  - competitorValue: What evidence says about the competitor (or "Unknown" if not in evidence)
  - source: Which evidence field supports this comparison
- Include 5-8 comparison fields covering: features, ease of use, pricing (only if in evidence), support, integrations
- Where evidence is missing for either side, set value to "Unknown" — do NOT guess
- CTA: Product-specific, not generic
- Do NOT claim ${productName} is "better" or "cheaper" without direct evidence

Return valid JSON:
{
  "title": "string",
  "purpose": "string",
  "primaryProduct": "${productName}",
  "comparedCompetitors": [{"name": "from evidence", "domain": "from evidence"}],
  "comparisonFields": [{"field": "attribute", "ourValue": "from evidence or Unknown", "competitorValue": "from evidence or Unknown", "source": "evidence field"}],
  "cta": "string",
  "evidenceUsed": [],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Comparison AI failed:`, e.message); }
  return null;
}

async function generateFeatureAnnouncement(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const features = brief.product?.features || [];
  const featureNames = features.map(f => typeof f === 'string' ? f : f.name || '').filter(Boolean);

  const prompt = `You are a product marketing manager writing a feature announcement for ${productName}.

Select the MOST IMPACTFUL feature from the evidence and write an announcement about it.

PRODUCT EVIDENCE:
${evidence}

AVAILABLE FEATURES: ${featureNames.join(', ') || 'None listed'}

REQUIREMENTS:
- Feature name: Must be one of the features listed above
- Feature description: Must come from evidence, not invented
- Benefit: What it means for the user (from evidence)
- availability: MUST be null — never fabricate release dates
- Title: "${productName} Introduces [Feature Name]" style
- CTA: Product-specific
- Do NOT invent launch dates, beta programs, or availability windows

Return valid JSON:
{
  "title": "string",
  "purpose": "string",
  "featureName": "from evidence features list",
  "featureDescription": "from evidence",
  "benefit": "from evidence or marked as inferred",
  "availability": null,
  "cta": "string",
  "evidenceUsed": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Feature AI failed:`, e.message); }
  return null;
}

async function generateWhitepaper(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const industry = brief.company?.industry || 'the industry';
  const persona = brief.targetPersonas?.[0]?.name || 'decision makers';
  const painPoint = brief.painPoints?.[0] || '';

  const prompt = `You are an industry analyst writing a whitepaper for ${productName} in ${industry}.

This whitepaper educates ${persona} about a problem in ${industry} and positions ${productName}'s approach as a credible solution.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Title: Professional, research-oriented (e.g., "The State of [Topic] in ${industry}")
- Executive summary: 150-200 words, evidence-backed overview of the problem and solution
- 4-6 sections, each with heading and 200-300 word content block
- Sections should cover: industry landscape, the core problem, why current approaches fail, how ${productName} addresses it, measurable outcomes (only from evidence), future outlook
- Conclusion: Summarize findings, product positioning, and call to action
- Limitations: List topics where evidence was insufficient
- Do NOT fabricate statistics, research citations, or industry data
- Do NOT make claims not supported by evidence — mark as "limited evidence available"
- Reference specific features and benefits from the evidence

Return valid JSON:
{
  "title": "string",
  "purpose": "string",
  "audience": "string",
  "executiveSummary": "150-200 word evidence-backed summary",
  "sections": [{"heading": "string", "content": "200-300 words, evidence-backed"}],
  "conclusion": "string",
  "evidenceUsed": [],
  "limitations": ["topics where evidence was insufficient"]
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Whitepaper AI failed:`, e.message); }
  return null;
}

async function generateSocialPost(postType, brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const persona = brief.targetPersonas?.[0]?.name || 'professionals';
  const painPoint = brief.painPoints?.[0] || '';
  const feature1 = brief.product?.features?.[0];
  const featureName = typeof feature1 === 'string' ? feature1 : feature1?.name || '';
  const usp = brief.product?.usp || '';

  const platformGuidance = {
    linkedin_post: {
      tone: 'professional, thought-leadership, value-driven',
      structure: 'Hook → Insight/Story → Product relevance → CTA',
      length: 'max 3000 chars',
      constraints: 'No hashtags in body, max 3 hashtags at end. Professional tone. Start with a bold statement or question.',
    },
    instagram_post: {
      tone: 'visual, engaging, lifestyle-oriented',
      structure: 'Hook → Story/Product highlight → Benefit → CTA',
      length: 'max 2200 chars',
      constraints: 'Max 5 relevant hashtags. First line must be compelling. Use line breaks for readability.',
    },
    twitter_post: {
      tone: 'concise, punchy, shareable',
      structure: 'Single compelling message in 280 chars',
      length: 'max 280 chars',
      constraints: 'Must be self-contained. No threads. One clear message.',
    },
    facebook_post: {
      tone: 'conversational, community-focused',
      structure: 'Question/Hook → Story → Product mention → CTA',
      length: 'max 2000 chars',
      constraints: 'Conversational tone. Ask questions to drive engagement. Tag product naturally.',
    },
    youtube_description: {
      tone: 'informative, SEO-optimized',
      structure: 'Summary → Timestamps → Links → CTA',
      length: 'max 5000 chars',
      constraints: 'Include timestamps, product links, and a compelling summary.',
    },
  };

  const guidance = platformGuidance[postType] || platformGuidance.linkedin_post;

  const prompt = `You are a ${postType.replace('_', ' ')} specialist writing for ${productName}.

Write a ${postType.replace('_', ' ')} that would resonate with ${persona} who struggle with "${painPoint}".

PRODUCT EVIDENCE:
${evidence}

PLATFORM: ${postType.replace('_', ' ')}
TONE: ${guidance.tone}
STRUCTURE: ${guidance.structure}
LENGTH: ${guidance.length}
CONSTRAINTS: ${guidance.constraints}

REQUIREMENTS:
- Reference the product feature "${featureName}" or USP "${usp}" naturally
- Must feel native to the platform — NOT a copied-and-pasted message
- CTA must be specific to ${productName}, not generic
- Do NOT use fake engagement tactics ("Tag a friend who...", "Double tap if...")
- Do NOT invent statistics or customer quotes

Return valid JSON matching the ${postType} schema.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return { ...result.data, _platform: postType };
  } catch (e) { console.warn(`[ContentStudio] ${postType} AI failed:`, e.message); }
  return null;
}

async function generateEmailCopy(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const persona = brief.targetPersonas?.[0]?.name || 'professionals';
  const painPoint = brief.painPoints?.[0] || '';
  const usp = brief.product?.usp || '';

  const prompt = `You are an email marketing specialist writing a promotional email for ${productName}.

This email targets ${persona} who struggle with "${painPoint}" and introduces ${productName} as the solution.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Subject line: Max 60 chars, product-specific, not clickbait. Reference "${productName}" or the pain point.
- Preview text: Max 100 chars, complements the subject line
- Body structure:
  1. Opening hook (pain point "${painPoint}")
  2. Agitation (why this problem matters)
  3. Solution introduction (${productName} and its USP)
  4. 2-3 specific features with benefits (from evidence)
  5. Single clear CTA
- Personalization: Use only {{firstName}} — no other variables
- Tone: Conversational, empathetic, professional
- Do NOT invent statistics, testimonials, or customer names
- Do NOT use ALL CAPS for emphasis

Return valid JSON:
{
  "subjectLine": "max 60 chars, product-specific",
  "previewText": "max 100 chars",
  "body": "structured email body in markdown",
  "cta": "single product-specific CTA",
  "personalizationFields": ["{{firstName}}"],
  "evidenceUsed": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Email AI failed:`, e.message); }
  return null;
}

async function generateCreativeBrief(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const brandName = brief.product?.brandName || productName;
  const industry = brief.company?.industry || '';
  const persona = brief.targetPersonas?.[0]?.name || 'professionals';
  const features = brief.product?.features?.slice(0, 3).map(f => typeof f === 'string' ? f : f.name || '').filter(Boolean).join(', ') || '';
  const techHints = brief.website?.technologyHints?.slice(0, 3).join(', ') || '';

  const prompt = `You are a creative director writing a design brief for ${productName} by ${brandName}.

The creative should resonate with ${persona} and highlight the product's key capabilities.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Objective: What this creative should achieve (awareness, consideration, conversion)
- Audience: Specific persona from evidence
- Message: Core message derived from USP or top feature
- Visual direction: Reference the ${industry} industry, product category, and brand identity. Be specific about colors, imagery style, and mood. Do NOT reference generic stock imagery.
- Brand signals: Visual cues from ${techHints || 'product features and technology'}
- Required text: Safe text overlay (2-5 words, product name or tagline)
- Format: One of poster / banner / social / display / email-header
- Evidence limitations: What cannot be claimed in the creative (fake stats, comparisons, etc.)
- CTA: Product-specific

Return valid JSON:
{
  "objective": "string",
  "audience": "string",
  "message": "core message from USP or features",
  "visualDirection": "specific visual direction referencing product/industry",
  "brandSignals": ["visual cues from product features or technology"],
  "requiredText": "text overlay (2-5 words)",
  "cta": "string",
  "format": "poster / banner / social / display / email-header",
  "evidenceLimitations": ["what cannot be claimed"],
  "evidenceUsed": [],
  "claimsRequiringReview": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Creative brief AI failed:`, e.message); }
  return null;
}

async function generateVideoScript(brief) {
  const evidence = buildEvidenceSection(brief);
  const productName = brief.product?.name || 'the product';
  const persona = brief.targetPersonas?.[0]?.name || 'professionals';
  const painPoint = brief.painPoints?.[0] || '';
  const usp = brief.product?.usp || '';
  const feature1 = brief.product?.features?.[0];
  const featureName = typeof feature1 === 'string' ? feature1 : feature1?.name || '';

  const prompt = `You are a video scriptwriter creating a promotional video script for ${productName}.

The video targets ${persona} who struggle with "${painPoint}" and shows how ${productName} solves it.

PRODUCT EVIDENCE:
${evidence}

REQUIREMENTS:
- Duration: 30 seconds (6 scenes, ~5 seconds each)
- Scene structure: Each scene needs narration (voiceover), on-screen text, visual description, evidence point, and optional CTA
- Scene 1: Hook — show the pain point "${painPoint}"
- Scene 2: Agitation — why this problem matters
- Scene 3: Solution reveal — introduce ${productName}
- Scene 4: Feature highlight — showcase "${featureName}" specifically
- Scene 5: Benefit proof — what the user gets
- Scene 6: CTA — clear next step
- Narration: Conversational, 15-20 words per scene
- On-screen text: 3-5 words per scene, product-specific
- Every scene must reference specific product/audience from evidence
- Do NOT invent statistics, customer quotes, or awards

Return valid JSON:
{
  "duration": "30s",
  "scenes": [{"scene": 1, "narration": "15-20 words", "onScreenText": "3-5 words", "visual": "scene description", "evidencePoint": "which evidence this uses", "cta": "scene CTA or null"}],
  "evidenceUsed": [],
  "limitations": []
}`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) return result.data;
  } catch (e) { console.warn(`[ContentStudio] Video script AI failed:`, e.message); }
  return null;
}

// ================================================
// GENERATOR MAP
// ================================================

const GENERATORS = {
  blog_article: generateBlogArticle,
  faq_page: generateFAQ,
  landing_page: generateLandingPage,
  product_page: generateProductPage,
  comparison_page: generateComparisonPage,
  feature_announcement: generateFeatureAnnouncement,
  whitepaper: generateWhitepaper,
  linkedin_post: (b) => generateSocialPost('linkedin_post', b),
  instagram_post: (b) => generateSocialPost('instagram_post', b),
  twitter_post: (b) => generateSocialPost('twitter_post', b),
  facebook_post: (b) => generateSocialPost('facebook_post', b),
  youtube_description: (b) => generateSocialPost('youtube_description', b),
  email_copy: generateEmailCopy,
  creative_brief: generateCreativeBrief,
  video_script: generateVideoScript,
};

// ================================================
// MAIN EXPORTS
// ================================================

export async function generateContent(assetType, brief, evidenceContext, callAiFn, userId, chatId) {
  const typeConfig = CONTENT_TYPES[assetType];
  if (!typeConfig) throw new Error(`Unknown content type: ${assetType}`);

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

  // Validate AI output against Zod schema
  const schemaValidation = validateContentOutput(result, assetType);
  if (!schemaValidation.valid) {
    return {
      content: result,
      metadata: {
        type: assetType,
        label: typeConfig.label,
        status: 'schema_rejected',
        generatedAt: new Date().toISOString(),
        provider: result._provider || 'content_studio_ai',
        schemaErrors: schemaValidation.errors,
      },
    };
  }

  // Validate claims
  const claimValidation = validateContentClaims(result, assetType);

  return {
    content: schemaValidation.data,
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
  // Backward compatibility: if first arg is an object (marketing-execution context), treat as legacy call
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
