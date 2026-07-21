import { callAI } from '../../ai/services/aiRouter.service.js';
import { validateContentClaims, validateBriefContent } from './claim-validator.service.js';
import { validateContentOutput, repairAIOutput, SCHEMA_REGISTRY } from './content-schemas.js';
import { resolveProductIdentity } from '../resolvers/product-identity.resolver.js';
import { createStableHash } from '../../utils/stable-hash.js';
import { CONTENT_TYPES, CONTENT_TYPES_LIST } from '../../constants/content-types.js';
import { EMAIL_WORD_COUNT_LIMITS, validateEmailCopyDTO, createEmptyEmailCopyDTO } from '../../dto/email-copy.dto.js';

export { CONTENT_TYPES, CONTENT_TYPES_LIST } from '../../constants/content-types.js';

const INVALID_PRODUCT_LABELS = new Set([
  'unknown product', 'new analysis', 'new & featured', 'untitled',
  'new project', 'growth analysis', 'featured', 'home',
]);

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

const FALLBACK_FAILURE = { _status: 'generation_failed', _reason: 'AI generation failed, no rule-based templates available', _provider: 'ai' };


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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
}

async function generateEmailCopy(brief, aiFunction = callAI) {
  // PART 4: Use normalized product identity
  const productIdentity = brief?.productIdentity || {};
  const displayName = productIdentity.displayName || brief?.product?.name || brief?.product?.brandName || brief?.company?.name || 'this solution';
  const internalName = productIdentity.internalName || '';
  const brandName = productIdentity.brandName || brief?.product?.brandName || '';
  const domain = productIdentity.domain || '';
  const productContext = buildProductEvidenceContext(brief);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  // Enhanced email workflow configuration
  const emailType = brief?.emailType || 'Product Announcement';
  const goal = brief?.goal || 'Product Adoption';
  const tone = brief?.tone || 'Professional';
  const audience = brief?.audience || persona;
  const language = brief?.language || 'en';
  
  // Sender information from brief or defaults
  const sender = {
    name: brief?.senderName || brandName || displayName,
    email: brief?.senderEmail || `noreply@${domain || 'example.com'}`,
    replyTo: brief?.replyToEmail || brief?.senderEmail || `noreply@${domain || 'example.com'}`
  };

  // Recipient information for personalization
  const recipient = brief?.recipient || {
    email: '',
    firstName: '',
    lastName: '',
    companyName: ''
  };

  // CTA URL from brief
  const ctaUrl = brief?.ctaUrl || brief?.websiteUrl || `https://${domain || 'example.com'}`;

  // PART 4: Use stable word count limits from DTO
  const wc = EMAIL_WORD_COUNT_LIMITS[emailType] || EMAIL_WORD_COUNT_LIMITS['Product Announcement'];

  const prompt = `You are a professional email copywriter. Generate a ${emailType} email for ${displayName}.

${productContext}

EMAIL CONFIGURATION:
- Email Type: ${emailType}
- Goal: ${goal}
- Tone: ${tone}
- Audience: ${audience}
- Language: ${language}
- Sender: ${sender.name} (${sender.email})
- CTA URL: ${ctaUrl}

REQUIREMENTS:
- Word count: ${wc.min}-${wc.max} words total
- Use product name "${displayName}" consistently (NOT internal name "${internalName}")
- subject: Compelling subject line, max 70 chars, include product name
- subjectAlternatives: Array of 2-3 alternative subject lines for A/B testing
- previewText: Compelling preview text, max 150 chars
- greeting: Professional greeting with personalization placeholder (e.g., "Hi {{firstName}},")
- headline: Main headline or hook that captures attention
- opening: Strong opening paragraph addressing the pain point
- painPoint: 1-2 sentences describing the specific problem
- solution: 2-3 sentences on how ${displayName} solves it
- benefits: Array of 3-5 key benefits
- bodyParagraphs: Array of 2-4 paragraphs that form the email body
- socialProof: Social proof or testimonials (if available from evidence)
- primaryCta: Object with label (CTA button text) and url (use provided CTA URL)
- secondaryCta: Optional secondary CTA object
- closing: Warm closing paragraph
- signature: Sender signature with company name
- postscript: Optional P.S. line reinforcing key benefit
- complianceFooter: Compliance footer with legal information
- unsubscribeText: Unsubscribe text and link
- html: Responsive HTML version of the email (inline styles, ready to send)
- plainText: Plain text version of the email
- evidenceUsed: Array of evidence fields referenced from context

Do NOT use: fake stats, testimonials (unless in evidence), ROI claims, invented data, superlatives, competitor bashing, generic placeholders like "our product" or "the platform".

Return valid JSON:
{
  "subject": "string",
  "subjectAlternatives": ["string"],
  "previewText": "string",
  "greeting": "string",
  "headline": "string",
  "opening": "string",
  "painPoint": "string",
  "solution": "string",
  "benefits": ["string"],
  "bodyParagraphs": ["string"],
  "socialProof": "string",
  "primaryCta": { "label": "string", "url": "string" },
  "secondaryCta": { "label": "string", "url": "string" } or null,
  "closing": "string",
  "signature": "string",
  "postscript": "string",
  "complianceFooter": "string",
  "unsubscribeText": "string",
  "html": "string",
  "plainText": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) {
      const data = result.data;
      const benefits = Array.isArray(data.benefits) ? data.benefits : [];
      const bodyParagraphs = Array.isArray(data.bodyParagraphs) ? data.bodyParagraphs : [];
      const subjectAlternatives = Array.isArray(data.subjectAlternatives) ? data.subjectAlternatives : [];

      // PART 4: Validate against DTO schema
      const validationResult = validateEmailCopyDTO(data);
      if (!validationResult.valid) {
        console.warn('[Email Copy] DTO validation failed:', validationResult.errors);
        // Continue with best-effort data but log warnings
      }

      // Ensure CTA URL is set from brief
      const primaryCta = {
        label: data.primaryCta?.label || 'Learn More',
        url: data.primaryCta?.url || ctaUrl
      };

      const secondaryCta = data.secondaryCta ? {
        label: data.secondaryCta.label,
        url: data.secondaryCta.url || ctaUrl
      } : null;

      return {
        id: `email_${Date.now()}`,
        contentType: 'email_copy',
        emailType,
        goal,
        tone,
        audience,
        language,
        sender,
        recipient,
        productIdentity: {
          internalName,
          displayName,
          brandName,
          domain,
        },
        subject: data.subject || `${displayName}: ${goal}`,
        subjectAlternatives,
        previewText: data.previewText || `Discover how ${displayName} can help you`,
        greeting: data.greeting || 'Hi {{firstName}},',
        headline: data.headline || `Transform Your Experience with ${displayName}`,
        opening: data.opening || '',
        painPoint: data.painPoint || '',
        solution: data.solution || '',
        benefits,
        bodyParagraphs,
        socialProof: data.socialProof || '',
        primaryCta,
        secondaryCta,
        closing: data.closing || '',
        signature: data.signature || sender.name,
        postscript: data.postscript || '',
        complianceFooter: data.complianceFooter || `© ${new Date().getFullYear()} ${brandName || displayName}. All rights reserved.`,
        unsubscribeText: data.unsubscribeText || 'Unsubscribe',
        html: data.html || '',
        plainText: data.plainText || '',
        evidenceUsed: data.evidenceUsed || [],
        quality: {
          score: validationResult.valid ? 1 : 0.5,
          checks: validationResult.errors || [],
          warnings: validationResult.warnings || [],
        },
        approvalStatus: 'DRAFT',
        deliveryStatus: null,
        createdAt: new Date().toISOString(),
        _provider: result.provider,
      };
    }
  } catch (e) { 
    console.error('[Email Copy] AI generation failed, using fallback:', e.message);
  }

  // PART 5: Deterministic complete fallback when AI parsing fails
  return generateEmailCopyFallback(displayName, internalName, brandName, domain, emailType, persona, painPoint, goal, tone, audience, sender, ctaUrl);
}

/**
 * PART 5: Deterministic fallback for email_copy generation
 * Returns complete, valid email structure with metadata marking
 */
function generateEmailCopyFallback(displayName, internalName, brandName, domain, emailType, persona, painPoint, goal, tone, audience, sender, ctaUrl) {
  const fallbackData = {
    id: `email_fallback_${Date.now()}`,
    contentType: 'email_copy',
    emailType,
    goal,
    tone,
    audience,
    language: 'en',
    sender,
    recipient: {
      email: '',
      firstName: '',
      lastName: '',
      companyName: ''
    },
    productIdentity: {
      internalName,
      displayName,
      brandName,
      domain,
    },
    subject: `${displayName}: A Solution for ${persona}`,
    subjectAlternatives: [
      `Discover ${displayName} for ${persona}`,
      `${goal} with ${displayName}`
    ],
    previewText: `Learn how ${displayName} can help ${persona} overcome ${painPoint}`,
    greeting: 'Hi {{firstName}},',
    headline: `Transform Your Experience with ${displayName}`,
    opening: `As a ${persona}, you understand the challenge of ${painPoint}.`,
    painPoint: painPoint || 'Many professionals struggle with inefficient workflows and limited visibility.',
    solution: `${displayName} provides a comprehensive solution that addresses these challenges directly.`,
    benefits: [
      `Streamlined workflows for ${persona}`,
      `Enhanced visibility and control`,
      `Improved productivity and efficiency`,
      `Cost-effective solution`,
      `Easy implementation and adoption`
    ],
    bodyParagraphs: [
      `${displayName} is designed specifically for ${persona} who need to overcome ${painPoint}. Our platform combines advanced features with intuitive design to deliver measurable results.`,
      `With ${displayName}, you gain access to powerful tools that help you ${goal.toLowerCase()}. Our solution has been tested and refined based on feedback from professionals like you.`,
      `Get started today and see the difference ${displayName} can make for your workflow.`
    ],
    socialProof: '',
    primaryCta: {
      label: 'Get Started',
      url: ctaUrl
    },
    secondaryCta: null,
    closing: `We're excited to help you achieve your goals with ${displayName}.`,
    signature: sender.name,
    postscript: `P.S. Start your journey with ${displayName} today and see immediate results.`,
    complianceFooter: `© ${new Date().getFullYear()} ${brandName || displayName}. All rights reserved.`,
    unsubscribeText: 'Unsubscribe',
    html: generateFallbackHtml(displayName, sender, ctaUrl),
    plainText: generateFallbackPlainText(displayName, sender, ctaUrl),
    evidenceUsed: [],
    quality: {
      score: 0.5,
      checks: ['fallback_used'],
      warnings: ['Using deterministic fallback due to AI generation failure'],
    },
    approvalStatus: 'DRAFT',
    deliveryStatus: null,
    createdAt: new Date().toISOString(),
    _fallbackUsed: true,
    _provider: 'fallback',
  };

  return fallbackData;
}

/**
 * Generate fallback HTML for email
 */
function generateFallbackHtml(displayName, sender, ctaUrl) {
  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${displayName}</title>
</head>
<body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px;">
  <div style="background-color: #f4f4f4; padding: 20px; border-radius: 5px;">
    <h1 style="color: #0066cc; margin-top: 0;">Transform Your Experience with ${displayName}</h1>
    <p>Hi {{firstName}},</p>
    <p>As a professional, you understand the challenge of inefficient workflows and limited visibility.</p>
    <p><strong>${displayName}</strong> provides a comprehensive solution that addresses these challenges directly.</p>
    <ul>
      <li>Streamlined workflows</li>
      <li>Enhanced visibility and control</li>
      <li>Improved productivity and efficiency</li>
      <li>Cost-effective solution</li>
      <li>Easy implementation and adoption</li>
    </ul>
    <p>${displayName} is designed specifically for professionals who need to overcome these challenges. Our platform combines advanced features with intuitive design to deliver measurable results.</p>
    <p>With ${displayName}, you gain access to powerful tools that help you achieve your goals. Our solution has been tested and refined based on feedback from professionals like you.</p>
    <div style="text-align: center; margin: 30px 0;">
      <a href="${ctaUrl}" style="background-color: #0066cc; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; display: inline-block;">Get Started</a>
    </div>
    <p>We're excited to help you achieve your goals with ${displayName}.</p>
    <p style="margin-top: 30px;">Best regards,<br>${sender.name}</p>
    <p style="font-size: 12px; color: #666; margin-top: 30px;">P.S. Start your journey with ${displayName} today and see immediate results.</p>
    <hr style="border: none; border-top: 1px solid #ddd; margin: 30px 0;">
    <p style="font-size: 12px; color: #666;">© ${new Date().getFullYear()} ${sender.name}. All rights reserved.</p>
    <p style="font-size: 12px; color: #666;"><a href="#" style="color: #666;">Unsubscribe</a></p>
  </div>
</body>
</html>`;
}

/**
 * Generate fallback plain text for email
 */
function generateFallbackPlainText(displayName, sender, ctaUrl) {
  return `Transform Your Experience with ${displayName}

Hi {{firstName}},

As a professional, you understand the challenge of inefficient workflows and limited visibility.

${displayName} provides a comprehensive solution that addresses these challenges directly.

Key Benefits:
- Streamlined workflows
- Enhanced visibility and control
- Improved productivity and efficiency
- Cost-effective solution
- Easy implementation and adoption

${displayName} is designed specifically for professionals who need to overcome these challenges. Our platform combines advanced features with intuitive design to deliver measurable results.

With ${displayName}, you gain access to powerful tools that help you achieve your goals. Our solution has been tested and refined based on feedback from professionals like you.

Get Started: ${ctaUrl}

We're excited to help you achieve your goals with ${displayName}.

Best regards,
${sender.name}

P.S. Start your journey with ${displayName} today and see immediate results.

---
© ${new Date().getFullYear()} ${sender.name}. All rights reserved.
Unsubscribe: [unsubscribe link]`;
}

async function generateCreativeBrief(brief) {
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
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
  return FALLBACK_FAILURE;
}

const GENERATORS = {
  linkedin_post: generateLinkedInPost,
  instagram_post: generateInstagramPost,
  twitter_post: generateTwitterPost,
  facebook_post: generateFacebookPost,
  youtube_description: generateYouTubeDescription,
  email_copy: generateEmailCopy,
  email_campaign: generateEmailCopy,
  email_nurture: generateEmailCopy,
  email_newsletter: generateEmailCopy,
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

  const identity = brief?._productIdentity || {};
  const productName = (identity?.productName || '').toLowerCase().trim();
  if (INVALID_PRODUCT_LABELS.has(productName) || !productName || productName.length < 2) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'blocked',
      _reason: `Invalid product identity: "${identity?.productName || 'none'}" — content generation requires a verified product`,
      _generatedAt: new Date().toISOString(),
    };
  }

  // PART 6: Use passed AI function from generationContext for provider routing, testing, and logging
  const aiFunction = callAiFn || callAI;
  const result = await generator(brief, aiFunction);

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
    const retryResult = await generator(retryBrief, aiFunction);
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

  const claimValidation = validateContentClaims(schemaValidation.data, assetType);

  const validatedContent = {
    ...(claimValidation.sanitized || schemaValidation.data),
    _type: assetType,
    _approvalStatus: APPROVAL_STATUSES.DRAFT,
    _generatedAt: new Date().toISOString(),
    _version: 1,
  };

  // For email copy, render full HTML template
  if (assetType === 'email_copy' || assetType === 'email_campaign') {
    const companyName = brief?.company?.name || brief?.product?.name || '';
    const companyWebsite = brief?.company?.websiteUrl || '';
    const renderedEmail = renderEmailHtmlTemplate(validatedContent, companyName, companyWebsite);
    validatedContent._htmlTemplate = renderedEmail.html;
    validatedContent._plainText = renderedEmail.plainText;
    validatedContent._subject = renderedEmail.subject;
  }

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
      approvalStatus: APPROVAL_STATUSES.DRAFT,
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

export { generateLinkedInPost, generateInstagramPost, generateTwitterPost, generateFacebookPost, generateYouTubeDescription, generateEmailCopy, generateCreativeBrief, generateVideoScript, generateBlogArticle, generateFAQ, generateLandingPage, generateProductPage, generateComparisonPage, generateFeatureAnnouncement, generateWhitepaper, renderEmailHtmlTemplate, APPROVAL_STATUSES };

// ============================================
// EMAIL HTML TEMPLATE GENERATOR
// ============================================

const APPROVAL_STATUSES = {
  DRAFT: 'draft',
  VALIDATION_FAILED: 'validation_failed',
  READY_FOR_REVIEW: 'ready_for_review',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CHANGES_REQUESTED: 'changes_requested',
  SCHEDULED: 'scheduled',
  SENDING: 'sending',
  SENT: 'sent',
  FAILED: 'failed',
};

const VALID_TRANSITIONS = {
  [APPROVAL_STATUSES.DRAFT]: [APPROVAL_STATUSES.VALIDATION_FAILED, APPROVAL_STATUSES.READY_FOR_REVIEW],
  [APPROVAL_STATUSES.VALIDATION_FAILED]: [APPROVAL_STATUSES.DRAFT, APPROVAL_STATUSES.READY_FOR_REVIEW],
  [APPROVAL_STATUSES.READY_FOR_REVIEW]: [APPROVAL_STATUSES.APPROVED, APPROVAL_STATUSES.REJECTED, APPROVAL_STATUSES.CHANGES_REQUESTED],
  [APPROVAL_STATUSES.APPROVED]: [APPROVAL_STATUSES.SCHEDULED, APPROVAL_STATUSES.SENDING, APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.REJECTED]: [APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.CHANGES_REQUESTED]: [APPROVAL_STATUSES.DRAFT, APPROVAL_STATUSES.READY_FOR_REVIEW],
  [APPROVAL_STATUSES.SCHEDULED]: [APPROVAL_STATUSES.SENDING, APPROVAL_STATUSES.FAILED, APPROVAL_STATUSES.DRAFT],
  [APPROVAL_STATUSES.SENDING]: [APPROVAL_STATUSES.SENT, APPROVAL_STATUSES.FAILED],
  [APPROVAL_STATUSES.SENT]: [],
  [APPROVAL_STATUSES.FAILED]: [APPROVAL_STATUSES.DRAFT],
};

export function transitionApprovalStatus(content, newStatus, { approvedBy, approvedAt, reason } = {}) {
  if (!content || typeof content !== 'object') return content;
  const current = content._approvalStatus || APPROVAL_STATUSES.DRAFT;
  const allowed = VALID_TRANSITIONS[current];
  if (!allowed || !allowed.includes(newStatus)) {
    console.warn('[Approval] Invalid transition', { from: current, to: newStatus, allowed });
    return null;
  }

  const updated = {
    ...content,
    _approvalStatus: newStatus,
    _approvalHistory: [
      ...(Array.isArray(content._approvalHistory) ? content._approvalHistory : []),
      {
        from: current,
        to: newStatus,
        timestamp: new Date().toISOString(),
        approvedBy: approvedBy || null,
        reason: reason || null,
      }
    ],
  };

  if (newStatus === APPROVAL_STATUSES.APPROVED) {
    updated._approvedBy = approvedBy || 'unknown';
    updated._approvedAt = approvedAt || new Date().toISOString();
    updated._revisionHash = createStableHash(JSON.stringify({
      html: content._htmlTemplate || '',
      plainText: content._plainText || '',
      subject: content.subject || '',
    }));
    updated._version = (content._version || 1) + 1;
  }

  if (newStatus === APPROVAL_STATUSES.DRAFT && content._approvedBy) {
    delete updated._approvedBy;
    delete updated._approvedAt;
    delete updated._revisionHash;
  }

  return updated;
}

function sanitizeText(text) {
  if (!text) return '';
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

function renderEmailHtmlTemplate(emailData, companyName = '', companyWebsite = '', unsubscribeUrl = null) {
  const subject = sanitizeText(emailData.subject || '');
  const previewText = sanitizeText(emailData.previewText || emailData.subject || '');
  const greeting = sanitizeText(emailData.greeting || (emailData.sections && emailData.sections.greeting) || '');
  const opening = sanitizeText(emailData.opening || (emailData.sections && emailData.sections.openingHook) || '');
  const bodyParagraphs = Array.isArray(emailData.bodyParagraphs) ? emailData.bodyParagraphs : [];
  const bulletPoints = Array.isArray(emailData.bulletPoints) ? emailData.bulletPoints : [];
  const ctaText = sanitizeText(emailData.ctaText || (emailData.primaryCta && emailData.primaryCta.label) || '');
  const ctaUrl = emailData.ctaUrl || (emailData.primaryCta && emailData.primaryCta.destination) || '#';
  const closing = sanitizeText(emailData.closing || '');
  const signature = sanitizeText(emailData.signature || '');
  const complianceNote = sanitizeText(emailData.complianceNote || '');
  const company = sanitizeText(companyName || 'Our Company');
  const baseUrl = companyWebsite || '#';

  const bodyHtml = `
    ${greeting ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${greeting}</p>` : ''}
    ${opening ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${opening}</p>` : ''}
    ${bodyParagraphs.map(p => `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${sanitizeText(p)}</p>`).join('\n    ')}
    ${bulletPoints.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;">
      ${bulletPoints.map(b => `
      <tr>
        <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 8px 0; vertical-align: top; width: 20px;">•</td>
        <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 8px 0;">${sanitizeText(b)}</td>
      </tr>`).join('\n      ')}
    </table>` : ''}
    ${ctaText ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 24px 0;">
      <tr>
        <td align="center" style="background-color: #2563eb; border-radius: 6px;">
          <a href="${sanitizeText(ctaUrl)}" target="_blank" style="display: inline-block; font-family: Arial, sans-serif; font-size: 16px; font-weight: 600; color: #ffffff; text-decoration: none; padding: 12px 32px; border-radius: 6px;">${ctaText}</a>
        </td>
      </tr>
    </table>` : ''}
    ${closing ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${closing}</p>` : ''}
    ${signature ? `<p style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; margin: 0 0 16px 0;">${signature}</p>` : ''}
    ${complianceNote ? `<p style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.4; color: #888888; margin: 16px 0 0 0; font-style: italic;">${complianceNote}</p>` : ''}
  `;

  const unsubscribeHtml = unsubscribeUrl
    ? `<a href="${sanitizeText(unsubscribeUrl)}" target="_blank" style="color: #888888; text-decoration: underline; font-size: 12px;">Unsubscribe</a>`
    : `<span style="color: #888888; font-size: 12px;">To unsubscribe, reply with UNSUBSCRIBE</span>`;

  return {
    subject,
    html: `<!DOCTYPE html>
<html lang="en" xmlns="http://www.w3.org/1999/xhtml" xmlns:v="urn:schemas-microsoft-com:vml" xmlns:o="urn:schemas-microsoft-com:office:office">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta http-equiv="X-UA-Compatible" content="IE=edge">
  <meta name="x-apple-disable-message-reformatting">
  <title>${subject}</title>
  <!--[if mso]>
  <noscript>
    <xml>
      <o:OfficeDocumentSettings>
        <o:AllowPNG/>
        <o:PixelsPerInch>96</o:PixelsPerInch>
      </o:OfficeDocumentSettings>
    </xml>
  </noscript>
  <![endif]-->
</head>
<body style="margin: 0; padding: 0; background-color: #f4f4f4; font-family: Arial, sans-serif;">
  <!--[if mso]>
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
  <tr>
  <td align="center">
  <![endif]-->

  <!-- PREHEADER -->
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; line-height: 1px;">
    ${previewText}
  </div>
  <div style="display: none; max-height: 0; overflow: hidden; mso-hide: all; line-height: 1px;">
    &nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;‌&nbsp;
  </div>

  <!-- HEADER -->
  <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="background-color: #f4f4f4;">
    <tr>
      <td align="center" style="padding: 20px 10px;">
        <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="600" style="background-color: #ffffff; border-radius: 8px; overflow: hidden;">
          <tr>
            <td style="background-color: #1e293b; padding: 24px 32px; text-align: center;">
              <a href="${sanitizeText(baseUrl)}" target="_blank" style="color: #ffffff; text-decoration: none; font-size: 20px; font-weight: 700; letter-spacing: 0.5px;">${company}</a>
            </td>
          </tr>
          <tr>
            <td style="padding: 32px 32px 24px 32px;">
              ${bodyHtml}
            </td>
          </tr>
          <!-- FOOTER -->
          <tr>
            <td style="background-color: #f8fafc; padding: 24px 32px; border-top: 1px solid #e2e8f0;">
              <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%">
                <tr>
                  <td style="font-family: Arial, sans-serif; font-size: 12px; line-height: 1.5; color: #888888; text-align: center;">
                    <p style="margin: 0 0 8px 0;">© ${new Date().getFullYear()} ${company}. All rights reserved.</p>
                    <p style="margin: 0 0 8px 0;">
                      <a href="${sanitizeText(baseUrl)}" target="_blank" style="color: #888888; text-decoration: underline; font-size: 12px;">Visit our website</a>
                    </p>
                    <p style="margin: 0 0 0 0;">
                      ${unsubscribeHtml}
                    </p>
                  </td>
                </tr>
              </table>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>

  <!--[if mso]>
  </td>
  </tr>
  </table>
  <![endif]-->
</body>
</html>`,
    plainText: [
      subject ? `Subject: ${subject}` : '',
      '',
      greeting,
      opening,
      ...bodyParagraphs,
      ...bulletPoints.map(b => `- ${b}`),
      '',
      ctaText ? `${ctaText}: ${ctaUrl}` : '',
      '',
      closing,
      signature,
      complianceNote,
      '',
      `--- ${company} ---`,
      baseUrl !== '#' ? `Website: ${baseUrl}` : '',
      unsubscribeUrl ? `Unsubscribe: ${unsubscribeUrl}` : 'Reply UNSUBSCRIBE to opt out',
    ].filter(Boolean).join('\n'),
    sections: {
      preheader: previewText,
      header: company,
      greeting,
      opening,
      body: bodyHtml,
      footer: `© ${new Date().getFullYear()} ${company}. All rights reserved.`,
      unsubscribe: unsubscribeHtml,
    },
    subjectOptions: Array.isArray(emailData.subjectOptions) ? emailData.subjectOptions : (emailData._rawSubjectOptions ? JSON.parse(emailData._rawSubjectOptions) : []),
    personalizationVariables: Array.isArray(emailData.personalizationVariables) ? emailData.personalizationVariables : (
      Array.isArray(emailData.personalizationFields) ? emailData.personalizationFields.map(f => ({ name: f, description: `Personalization field: ${f}`, example: '' })) : []
    ),
    _emailType: emailData.emailType || null,
    _approvalStatus: APPROVAL_STATUSES.DRAFT,
    _generatedAt: new Date().toISOString(),
    _version: 1,
  };
}

export function previewEmail(htmlContent, plainText, subject, emailData) {
  const issues = [];

  const body = emailData?.bodyParagraphs?.join(' ') || '';
  const greeting = emailData?.greeting || emailData?.sections?.greeting || '';
  const ctaText = emailData?.ctaText || (emailData?.primaryCta && emailData?.primaryCta.label) || '';
  const ctaUrl = emailData?.ctaUrl || (emailData?.primaryCta && emailData?.primaryCta.destination) || '';
  const subjectLine = subject || emailData?.subject || '';
  const unsubscribeHtml = htmlContent?.includes('Unsubscribe') || htmlContent?.includes('unsubscribe');
  const hasClosing = emailData?.closing || emailData?.sections?.closing || false;
  const hasSignature = emailData?.signature || emailData?.sections?.signature || false;

  if (!subjectLine) issues.push({ severity: 'blocked', field: 'subject', message: 'Subject line is required' });
  if (!greeting) issues.push({ severity: 'blocked', field: 'greeting', message: 'Greeting is required' });
  if (!body || body.length < 20) issues.push({ severity: 'blocked', field: 'body', message: 'Email body is required' });
  if (!ctaText) issues.push({ severity: 'blocked', field: 'ctaText', message: 'Call-to-action is required' });
  if (!unsubscribeHtml) issues.push({ severity: 'blocked', field: 'unsubscribe', message: 'Unsubscribe link is required' });
  if (!hasClosing) issues.push({ severity: 'needs_review', field: 'closing', message: 'No closing paragraph' });
  if (!hasSignature) issues.push({ severity: 'needs_review', field: 'signature', message: 'No signature block' });

  const variablePattern = /\{\{[^}]+\}\}|{{[^}]+}}/g;
  if (htmlContent) {
    const unresolvedVars = htmlContent.match(variablePattern);
    if (unresolvedVars && unresolvedVars.length > 0) {
      issues.push({ severity: 'needs_review', field: 'personalization', message: `${unresolvedVars.length} unresolved variables: ${unresolvedVars.join(', ')}` });
    }
  }

  if (ctaUrl && !ctaUrl.startsWith('http') && !ctaUrl.startsWith('#')) {
    issues.push({ severity: 'needs_review', field: 'ctaUrl', message: `CTA URL "${ctaUrl}" may be invalid` });
  }

  const hasBlocked = issues.some(i => i.severity === 'blocked');
  const hasWarnings = issues.some(i => i.severity === 'needs_review');

  return {
    valid: !hasBlocked,
    status: hasBlocked ? 'blocked' : hasWarnings ? 'needs_review' : 'passed',
    issues,
    views: {
      desktop: htmlContent || '',
      plainText: plainText || '',
      mobile: htmlContent ? htmlContent.replace(/style="width:\s*600/g, 'style="width:100%') : '',
    },
    subject: subjectLine,
    previewText: emailData?.previewText || '',
  };
}

export function withApprovalStatus(content, status = APPROVAL_STATUSES.DRAFT) {
  if (!content || typeof content !== 'object') return content;
  return {
    ...content,
    _approvalStatus: status,
    _approvalHistory: [
      {
        status,
        timestamp: new Date().toISOString(),
        action: status === APPROVAL_STATUSES.DRAFT ? 'created' : `status_set_to_${status}`,
      }
    ],
    _version: 1,
  };
}
