
import { generateLinkedInPost, generateInstagramPost, generateTwitterPost, generateFacebookPost, generateYouTubeDescription } from '../../domains/content/agents/social.agent.js';
import { generateBlogArticle, generateFAQ } from '../../domains/content/agents/blog.agent.js';
import { generateLandingPage, generateProductPage, generateComparisonPage } from '../../domains/content/agents/page.agent.js';
import { generateFeatureAnnouncement, generateWhitepaper } from '../../domains/content/agents/document.agent.js';
import { generateVideoScript, generateCreativeBrief } from '../../domains/content/agents/script.agent.js';
import { buildProductEvidenceContext, getPersonaName, getFirstPainPoint } from '../../domains/content/agents/agent.utils.js';
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import { validateContentClaims, validateBriefContent } from "./claim-validator.service.js";
import { validateContentOutput, repairAIOutput } from "./content-schemas.js";
import { SCHEMA_REGISTRY } from "../../shared/schemas/content-types.schema.js";
import { CONTENT_TYPES, CONTENT_TYPES_LIST } from "../../constants/content-types.js";
import { EMAIL_WORD_COUNT_LIMITS, validateEmailCopyDTO, createEmptyEmailCopyDTO } from "../../dto/email-copy.dto.js";
import { scoreContentQuality, buildRewritePrompt, QUALITY_THRESHOLD } from "./quality-review.service.js";
import { saveContentMemory, buildEvidenceGraphHash, buildPromptHash } from "./content-memory.service.js";
import { enrichContentBrief, checkBriefRequirements } from "./brief-enrichment.service.js";

export { CONTENT_TYPES, CONTENT_TYPES_LIST } from "../../constants/content-types.js";

const INVALID_PRODUCT_LABELS = new Set([
  'unknown product', 'new analysis', 'new & featured', 'untitled',
  'new project', 'growth analysis', 'featured', 'home',
]);
































async function generateEmailCopy(brief, aiFunction = callAI, normalizedEvidence) {
  const productIdentity = brief?.productIdentity || {};
  const displayName = productIdentity.displayName || brief?.product?.name || brief?.product?.brandName || brief?.company?.name || 'this solution';
  const internalName = productIdentity.internalName || '';
  const brandName = productIdentity.brandName || brief?.product?.brandName || '';
  const domain = productIdentity.domain || '';
  const productContext = buildProductEvidenceContext(brief, normalizedEvidence);
  const persona = getPersonaName(brief);
  const painPoint = getFirstPainPoint(brief);

  const emailType = brief?.emailType || 'Product Announcement';
  const goal = brief?.goal || 'Product Adoption';
  const tone = brief?.tone || 'Professional';
  const audience = brief?.audience || persona;
  const language = brief?.language || 'en';

  const sender = {
    name: brief?.senderName || brandName || displayName,
    email: brief?.senderEmail || `noreply@${domain || 'example.com'}`,
    replyTo: brief?.replyToEmail || brief?.senderEmail || `noreply@${domain || 'example.com'}`
  };

  const recipient = brief?.recipient || { email: '', firstName: '', lastName: '', companyName: '' };
  const ctaUrl = brief?.ctaUrl || brief?.websiteUrl || `https://${domain || 'example.com'}`;
  const wc = EMAIL_WORD_COUNT_LIMITS[emailType] || EMAIL_WORD_COUNT_LIMITS['Product Announcement'];

  const features = Array.isArray(brief?.product?.features) ? brief.product.features.slice(0, 5) : [];
  const benefits = Array.isArray(brief?.product?.benefits) ? brief.product.benefits.slice(0, 5) : [];
  const featureTexts = features.map(f => typeof f === 'string' ? f : (f.name || f.feature || '')).filter(Boolean);
  const benefitTexts = benefits.map(b => typeof b === 'string' ? b : (b.text || b.benefit || '')).filter(Boolean);
  const campaignGoal = brief.campaign?.goal?.value || brief.campaign?.goal || '';
  const campaignObjective = brief.campaign?.objective?.value || brief.campaign?.objective || '';
  const brandVoice = brief.campaign?.brandVoice?.value || brief.campaign?.brandVoice || brief.brandVoice?.value || brief.brandVoice || '';

  const prompt = `You are an enterprise email copywriter for ${displayName}. Write a ${emailType} email comparable to HubSpot, Brevo, and Mailchimp quality standards.

${productContext}

BUSINESS CONTEXT:
Campaign Goal: ${campaignGoal || 'N/A'}
Campaign Objective: ${campaignObjective || 'N/A'}
Brand Voice: ${brandVoice || 'Professional'}

EMAIL CONFIGURATION:
- Email Type: ${emailType}
- Goal: ${goal}
- Tone: ${tone}
- Audience: ${audience}
- Language: ${language}
- Sender: ${sender.name}
- CTA URL: ${ctaUrl}
- Key Features: ${featureTexts.join(', ') || 'N/A'}
- Key Benefits: ${benefitTexts.join(', ') || 'N/A'}

REQUIREMENTS:
- Word count: ${wc.min}-${wc.max} words total
- Use "${displayName}" consistently (NOT "${internalName}")
- subject: Compelling subject line, max 70 chars, include product name
- previewText: Compelling preview text, max 150 chars
- greeting: Professional greeting with personalization (e.g., "Hi {{firstName}},")
- opening: Strong opening paragraph addressing pain point "${painPoint}"
- problem: 1-2 sentences describing the specific problem ${persona} faces
- solution: 2-3 sentences on how ${displayName} solves it with specific features
- featureHighlights: Array of 3-5 specific feature highlights with benefit
- benefits: Array of 3-5 key benefits
- socialProof: Social proof or testimonial placeholder (e.g., "Join 10,000+ teams")
- callToAction: Object with label (button text) and url
- signature: Professional sender signature
- footer: Compliance footer with company details and legal info
- personalizationVariables: Array of variable names used (firstName, companyName, etc.)
- html: Responsive HTML version with inline styles, ready to send
- plainText: Plain text version

Do NOT use: fake stats, invented testimonials, ROI claims, competitor bashing, generic placeholders.

Return valid JSON:
{
  "subject": "string — max 70 chars",
  "previewText": "string — max 150 chars",
  "greeting": "string — with {{firstName}}",
  "opening": "string — strong opening",
  "problem": "string — specific problem",
  "solution": "string — how ${displayName} solves it",
  "featureHighlights": ["string"],
  "benefits": ["string"],
  "socialProof": "string",
  "callToAction": { "label": "string", "url": "string" },
  "signature": "string",
  "footer": "string",
  "personalizationVariables": ["string"],
  "html": "string — responsive HTML",
  "plainText": "string",
  "evidenceUsed": ["list evidence fields referenced"],
  "claimsRequiringReview": []
}`;

  try {
    const result = await aiFunction(prompt);
    if (result.success && result.data) {
      const data = result.data;
      const featureHighlights = Array.isArray(data.featureHighlights) ? data.featureHighlights : [];
      const benefits = Array.isArray(data.benefits) ? data.benefits : [];
      const personalizationVariables = Array.isArray(data.personalizationVariables) ? data.personalizationVariables : [];

      const validationResult = validateEmailCopyDTO(data);
      if (!validationResult.valid) {
        console.warn('[Email Copy] DTO validation failed:', validationResult.errors);
      }

      const callToAction = {
        label: data.callToAction?.label || data.primaryCta?.label || 'Get Started',
        url: data.callToAction?.url || data.primaryCta?.url || ctaUrl
      };

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
        productIdentity: { internalName, displayName, brandName, domain },
        subject: data.subject || `${displayName}: ${goal}`,
        previewText: data.previewText || `Discover how ${displayName} can help you`,
        greeting: data.greeting || 'Hi {{firstName}},',
        opening: data.opening || '',
        problem: data.problem || data.painPoint || '',
        solution: data.solution || '',
        featureHighlights,
        benefits,
        socialProof: data.socialProof || '',
        callToAction,
        signature: data.signature || sender.name,
        footer: data.footer || data.complianceFooter || `© ${new Date().getFullYear()} ${brandName || displayName}. All rights reserved.`,
        personalizationVariables,
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
    recipient: { email: '', firstName: '', lastName: '', companyName: '' },
    productIdentity: { internalName, displayName, brandName, domain },
    subject: `${displayName}: A Solution for ${persona}`,
    previewText: `Learn how ${displayName} can help ${persona} overcome ${painPoint}`,
    greeting: 'Hi {{firstName}},',
    opening: `As a ${persona}, you understand the challenge of ${painPoint}.`,
    problem: painPoint || 'Many professionals struggle with inefficient workflows and limited visibility.',
    solution: `${displayName} provides a comprehensive solution that addresses these challenges directly.`,
    featureHighlights: [
      `Advanced ${goal.toLowerCase()} capabilities`,
      `Intuitive ${tone.toLowerCase()} interface`,
      `Seamless integration with existing tools`
    ],
    benefits: [
      `Streamlined workflows for ${persona}`,
      `Enhanced visibility and control`,
      `Improved productivity and efficiency`,
      `Cost-effective solution`,
      `Easy implementation and adoption`
    ],
    socialProof: '',
    callToAction: { label: 'Get Started', url: ctaUrl },
    signature: sender.name,
    footer: `© ${new Date().getFullYear()} ${brandName || displayName}. All rights reserved.`,
    personalizationVariables: ['firstName', 'lastName', 'companyName'],
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




















function unwrapSourced(val) {
  if (val && typeof val === 'object' && 'value' in val && 'source' in val) return val.value;
  return val;
}

function buildNormalizedEvidence(brief, evidenceContext) {
  const rawKeywords = brief.verifiedKeywords || [];
  const safeKeywords = Array.isArray(rawKeywords) ? rawKeywords : [];

  const kwSection = evidenceContext?.keywords || {};
  const primaryVal = unwrapSourced(kwSection.primary);
  const secondaryVal = unwrapSourced(kwSection.secondary);
  const longTailVal = unwrapSourced(kwSection.longTail);
  const questionVal = unwrapSourced(kwSection.question);

  const contextKeywords = [
    ...(Array.isArray(primaryVal) ? primaryVal : []),
    ...(Array.isArray(secondaryVal) ? secondaryVal : []),
    ...(Array.isArray(longTailVal) ? longTailVal : []),
    ...(Array.isArray(questionVal) ? questionVal : []),
  ];

  const combinedKeywords = [...safeKeywords, ...contextKeywords];
  const seen = new Set();
  const deduplicated = combinedKeywords.filter(k => {
    const key = typeof k === 'string' ? k : (k?.keyword || k?.phrase || '');
    if (!key || seen.has(key)) return false;
    seen.add(key);
    return true;
  });

  const productFeatures = Array.isArray(brief.product?.features) ? brief.product.features
    : Array.isArray(unwrapSourced(evidenceContext?.features)) ? unwrapSourced(evidenceContext?.features)
    : [];

  const productBenefits = Array.isArray(brief.product?.benefits) ? brief.product.benefits
    : Array.isArray(unwrapSourced(evidenceContext?.benefits)) ? unwrapSourced(evidenceContext?.benefits)
    : [];

  const audienceSection = evidenceContext?.audience || {};
  const painPoints = Array.isArray(brief.painPoints) ? brief.painPoints
    : Array.isArray(unwrapSourced(audienceSection.painPoints)) ? unwrapSourced(audienceSection.painPoints)
    : [];

  const competitorSection = evidenceContext?.competitors || {};
  const competitorsList = Array.isArray(brief.validatedCompetitors) ? brief.validatedCompetitors
    : Array.isArray(unwrapSourced(competitorSection.list)) ? unwrapSourced(competitorSection.list)
    : [];

  const contentGapSection = evidenceContext?.contentGaps || {};
  const contentGaps = Array.isArray(brief.contentGaps) ? brief.contentGaps
    : Array.isArray(unwrapSourced(contentGapSection.missingContent)) ? unwrapSourced(contentGapSection.missingContent)
    : [];

  const topicIdeas = Array.isArray(brief.topicIdeas) ? brief.topicIdeas
    : (evidenceContext?.seo?.topicIdeas?.value || evidenceContext?.seo?.blogIdeas?.value || []);

  return {
    keywords: deduplicated.slice(0, 30),
    primaryKeywords: Array.isArray(primaryVal) ? primaryVal.slice(0, 10) : [],
    features: productFeatures,
    benefits: productBenefits,
    painPoints,
    competitors: competitorsList,
    contentGaps,
    topicIdeas: Array.isArray(topicIdeas) ? topicIdeas : [],
    evidenceSnapshotId: evidenceContext?.evidenceSnapshotId || null,
  };
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

export async function generateContent(assetType, brief, evidenceContext, callAiFn, userId, chatId, prisma) {
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

  const identity = brief?._productIdentity || brief?.productIdentity || {};
  const productName = (identity?.productName || brief?.product?.name || '').toLowerCase().trim();
  if (INVALID_PRODUCT_LABELS.has(productName) || !productName || productName.length < 2) {
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'blocked',
      _reason: `Invalid product identity: "${identity?.productName || brief?.product?.name || 'none'}" — content generation requires a verified product`,
      _generatedAt: new Date().toISOString(),
    };
  }

  let enriched = brief;
  let enrichmentDiagnostics = null;
  if (prisma && userId && chatId && !brief._enrichedAt) {
    const enrichment = await enrichContentBrief(prisma, userId, chatId, brief);
    enriched = enrichment.brief;
    enrichmentDiagnostics = enrichment.diagnostics;
    if (enrichment.enriched) {
      console.info(`[Content Studio] Brief enriched: ${enrichment.diagnostics.enriched.join(', ')}`);
    }
  }

  const reqCheck = checkBriefRequirements(enriched);
  if (!reqCheck.passed) {
    const missingFields = reqCheck.failures.join(', ');
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'enrichment_failed',
      _reason: `Content generation failed because required fields were missing: ${missingFields}. Auto-repair attempted.`,
      _requirements: reqCheck,
      _enrichment: enrichmentDiagnostics,
      _generatedAt: new Date().toISOString(),
    };
  }

  const painPoint = getFirstPainPoint(enriched);
  const productDisplayName = enriched.product?.name || enriched.company?.name || 'this solution';

  const normalizedEvidence = buildNormalizedEvidence(enriched, evidenceContext);

  const aiFunction = callAiFn || callAI;
  const briefWithMeta = {
    ...enriched,
    _painPoint: painPoint,
    _productName: productDisplayName,
  };
  const result = await generator(briefWithMeta, aiFunction, normalizedEvidence);

  if (!result) {
    const missingReasons = [];
    if (!enriched.product?.features?.length) missingReasons.push('Missing Product Benefits');
    if (!enriched.campaign?.goal) missingReasons.push('Missing Campaign Goal');
    if (!enriched.verifiedKeywords?.length) missingReasons.push('Missing SEO Data');
    return {
      _type: assetType,
      _label: typeConfig.label,
      _status: 'generation_failed',
      _reason: `Content generation failed because required fields were missing. Auto-repair attempted. Retrying... ${missingReasons.length ? '(' + missingReasons.join(', ') + ')' : ''}`,
      _enrichment: enrichmentDiagnostics,
      _generatedAt: new Date().toISOString(),
    };
  }

  let repairedResult = repairAIOutput(result, assetType);
  let schemaValidation = validateContentOutput(repairedResult, assetType);

  for (let attempt = 0; attempt < 2 && !schemaValidation.valid; attempt++) {
    const retryBrief = {
      ...briefWithMeta,
      _retryInstructions: `Schema validation failed. Errors:\n${schemaValidation.errors.join('\n')}\nReturn valid JSON matching the original schema.`,
    };
    const retryResult = await generator(retryBrief, aiFunction, normalizedEvidence);
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
        missingFields: schemaValidation.missingFields || [],
        issues: schemaValidation.issues || [],
        enrichmentDiagnostics,
      },
    };
  }

  const claimValidation = validateContentClaims(schemaValidation.data, assetType);

  let validatedContent = {
    ...(claimValidation.sanitized || schemaValidation.data),
    _type: assetType,
    _approvalStatus: APPROVAL_STATUSES.DRAFT,
    _generatedAt: new Date().toISOString(),
    _version: 1,
    _productName: productDisplayName,
    _painPoint: painPoint,
  };

  if (assetType === 'email_copy' || assetType === 'email_campaign') {
    const companyName = enriched?.company?.name || enriched?.product?.name || '';
    const companyWebsite = enriched?.company?.websiteUrl || '';
    const renderedEmail = renderEmailHtmlTemplate(validatedContent, companyName, companyWebsite);
    validatedContent._htmlTemplate = renderedEmail.html;
    validatedContent._plainText = renderedEmail.plainText;
    validatedContent._subject = renderedEmail.subject;
  }

  let qualityResult = scoreContentQuality(validatedContent, evidenceContext?.product ? evidenceContext : null, assetType);
  let bestContent = validatedContent;
  let bestQuality = qualityResult.overall;
  let rewritesUsed = 0;

  for (let attempt = 1; attempt <= 3 && qualityResult.needsRewrite && userId; attempt++) {
    rewritesUsed = attempt;
    const rewritePrompt = buildRewritePrompt(bestContent, qualityResult, assetType, briefWithMeta);
    const rewriteResult = await callAI(rewritePrompt);
    if (!rewriteResult?.success || !rewriteResult?.data) break;

    let rewriteRepaired = repairAIOutput(rewriteResult.data, assetType);
    let rewriteValidation = validateContentOutput(rewriteRepaired, assetType);
    if (rewriteValidation.valid) {
      const rewriteClaimValidation = validateContentClaims(rewriteValidation.data, assetType);
      const rewrittenContent = {
        ...(rewriteClaimValidation.sanitized || rewriteValidation.data),
        _type: assetType,
        _approvalStatus: APPROVAL_STATUSES.DRAFT,
        _generatedAt: new Date().toISOString(),
        _version: 1,
        _rewritten: true,
        _rewriteAttempt: attempt,
        _originalScore: bestQuality,
        _productName: productDisplayName,
        _painPoint: painPoint,
      };
      if (assetType === 'email_copy' || assetType === 'email_campaign') {
        const companyName = enriched?.company?.name || enriched?.product?.name || '';
        const companyWebsite = enriched?.company?.websiteUrl || '';
        const renderedEmail = renderEmailHtmlTemplate(rewrittenContent, companyName, companyWebsite);
        rewrittenContent._htmlTemplate = renderedEmail.html;
        rewrittenContent._plainText = renderedEmail.plainText;
        rewrittenContent._subject = renderedEmail.subject;
      }
      qualityResult = scoreContentQuality(rewrittenContent, evidenceContext?.product ? evidenceContext : null, assetType);
      if (qualityResult.overall > bestQuality) {
        bestContent = rewrittenContent;
        bestQuality = qualityResult.overall;
      }
      if (!qualityResult.needsRewrite) break;
    }
  }

  validatedContent = bestContent;
  validatedContent._qualityScore = bestQuality;
  validatedContent._qualityDetails = qualityResult.details;
  validatedContent._qualityRewritesUsed = rewritesUsed;
  validatedContent._enrichmentDiagnostics = enrichmentDiagnostics;

  if (userId && chatId) {
    saveContentMemory(null, {
      userId, chatId,
      assetType,
      evidenceGraphHash: buildEvidenceGraphHash(evidenceContext),
      promptHash: buildPromptHash(briefWithMeta),
      aiOutput: result,
      finalOutput: validatedContent,
      qualityScore: bestQuality,
      provider: result._provider || 'content_studio_ai',
    });
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
      qualityScore: qualityResult,
      rewritesUsed,
      enrichmentDiagnostics,
    },
  };
}

export async function generateContentStudioPlan(typesOrCtx, brief, evidenceContext, callAiFn, userId, chatId, prisma) {
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
    return generateContentStudioPlan(allTypes, minimalBrief, execCtx, null, null, null, null);
  }

  const types = typesOrCtx;
  const results = [];

  for (const type of types) {
    const genResult = await generateContent(type, brief, evidenceContext, callAiFn, userId, chatId, null);
    if (genResult) results.push({ type, content: genResult.content || genResult, metadata: genResult.metadata || null });
  }

  return {
    assets: results,
    totalGenerated: results.length,
    _metadata: {
      evidenceSnapshotId: evidenceContext?.evidenceSnapshotId || null,
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
  const features = Array.isArray(emailData.features) ? emailData.features : [];
  const variables = Array.isArray(emailData.variables) ? emailData.variables : [];
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
    ${features.length > 0 ? `
    <table cellpadding="0" cellspacing="0" border="0" style="margin: 0 0 16px 0;">
      ${features.map(f => `
      <tr>
        <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 8px 0; vertical-align: top; width: 20px;">✦</td>
        <td style="font-family: Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; padding: 0 0 8px 0;">${sanitizeText(f)}</td>
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
    personalizationVariables: variables.length > 0 ? variables.map(v => ({ name: v, description: `Personalization field: ${v}`, example: '' })) : (
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