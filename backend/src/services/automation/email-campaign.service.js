import { prisma } from "../../config/prisma.js";
import { callAI } from "../../ai/services/aiRouter.service.js";
import { sendEmail, getEmailProviderHealth } from "../integrations/email/email-provider-registry.js";
import { renderEmailHtml, renderPlainText } from "../email/email-template-renderer.service.js";

function buildRichContext(plan, evidence, productIntelligence, seoData, campaignData, audienceData, competitorData) {
  const website = evidence?.website || {};
  const product = evidence?.product || productIntelligence?.productAnalysis || {};
  const company = evidence?.company || {};
  const audience = audienceData || plan?.audienceSelection || {};
  const seo = seoData?.keywordOpportunities || seoData?.keywordIntelligence || {};

  const features = [
    ...(Array.isArray(product.features) ? product.features : []),
    ...(Array.isArray(product.usps) ? product.usps : []),
    ...(Array.isArray(product.benefits) ? product.benefits : []),
    ...(Array.isArray(website.featuresText) ? website.featuresText : []),
    ...(Array.isArray(website.usps) ? website.usps : [])
  ].filter(Boolean);

  const painPoints = [
    ...(Array.isArray(audience.painPoints) ? audience.painPoints : []),
    ...(Array.isArray(product.painPoints) ? product.painPoints : []),
    ...(Array.isArray(evidence?.audience?.painPoints?.value) ? evidence.audience.painPoints.value : [])
  ].filter(Boolean);

  const competitors = [
    ...(Array.isArray(competitorData?.list?.value) ? competitorData.list.value : []),
    ...(Array.isArray(competitorData?.competitors) ? competitorData.competitors : []),
    ...(Array.isArray(plan?.competitors) ? plan.competitors : [])
  ].filter(Boolean);

  const seoKeywords = [
    ...(Array.isArray(seo.primaryKeywords) ? seo.primaryKeywords.map(k => k.keyword || k) : []),
    ...(Array.isArray(seo.secondaryKeywords) ? seo.secondaryKeywords.map(k => k.keyword || k) : []),
    ...(Array.isArray(evidence?.seo?.keywords?.value) ? evidence.seo.keywords.value : [])
  ].filter(Boolean).slice(0, 10);

  return {
    productName: product.name || product.productName || company.name || plan?.inputJson?.productName || '',
    companyName: company.name || company.companyName || plan?.inputJson?.companyName || '',
    industry: product.industry || evidence?.industry?.name || plan?.inputJson?.industry || '',
    targetAudience: audience.primary || audience.description || plan?.inputJson?.targetAudience || '',
    audiencePainPoints: painPoints.slice(0, 5),
    audienceRole: audience.role || audience.title || '',
    audienceIndustry: audience.industry || '',
    companySize: audience.companySize || audience.size || '',
    productFeatures: features.slice(0, 8),
    productCategory: product.category || product.productCategory || '',
    productType: product.type || product.productType || 'SaaS',
    valueProposition: product.valueProposition || product.usp || website.heroText || '',
    competitorNames: competitors.slice(0, 5).map(c => c.name || c.url || c).filter(Boolean),
    seoKeywords,
    tone: plan?.tone || company.tone || 'professional',
    brandVoice: company.brandVoice || product.brandVoice || '',
    pricingModel: product.pricing || product.pricingModel || '',
    targetMarket: product.targetMarket || product.marketSegment || '',
    businessModel: product.businessModel || '',
    revenueModel: product.revenueModel || '',
    ctaTexts: (website.ctaTexts?.value || website.ctaTexts || []).slice(0, 3),
    socialProof: (product.testimonials || product.caseStudies || []).slice(0, 3),
    evidenceSources: evidence?.sourceSummary?.sourcesCollected || []
  };
}

function buildAIPrompt(context, emailType = 'campaign') {
  const features = context.productFeatures.join(', ') || 'Not specified';
  const painPoints = context.audiencePainPoints.join(', ') || 'Not specified';
  const competitors = context.competitorNames.join(', ') || 'Not specified';
  const keywords = context.seoKeywords.join(', ') || 'Not specified';

  return `You are a Senior Email Marketing Strategist. Generate a unique, high-converting ${emailType} email using ONLY the verified context below.

COMPANY & PRODUCT (REAL - DO NOT CHANGE):
- Product: ${context.productName || 'N/A'}
- Company: ${context.companyName || 'N/A'}
- Industry: ${context.industry || 'N/A'}
- Category: ${context.productCategory || 'N/A'}
- Business Model: ${context.businessModel || 'N/A'}
- Pricing: ${context.pricingModel || 'N/A'}
- Value Proposition: ${context.valueProposition || 'N/A'}

TARGET AUDIENCE:
- Audience: ${context.targetAudience || 'N/A'}
- Role: ${context.audienceRole || 'N/A'}
- Industry: ${context.audienceIndustry || 'N/A'}
- Company Size: ${context.companySize || 'N/A'}
- Pain Points: ${painPoints}

PRODUCT FEATURES & BENEFITS:
- Features: ${features}
- Tone: ${context.tone || 'professional'}
- Brand Voice: ${context.brandVoice || 'N/A'}

COMPETITIVE LANDSCAPE:
- Competitors: ${competitors}

SEO KEYWORDS: ${keywords}

Generate a complete email with these EXACT sections:
- Subject Line (max 60 chars, specific to product, no clickbait)
- Preview Text (max 100 chars)
- Opening Hook (personalized, pain-point driven)
- Problem Statement (reference audience pain points)
- Solution Introduction (position product as solution)
- Features & Benefits (use actual features from context)
- Social Proof (reference adoption, trust signals - NO fake statistics)
- Call to Action (specific, action-oriented)
- Closing (warm, professional)
- Signature (include company name)
- P.S. (optional reinforcement of key benefit)

Return ONLY valid JSON:
{
  "subjectLine": "...",
  "previewText": "...",
  "opening": "...",
  "problem": "...",
  "solution": "...",
  "features": "...",
  "benefits": "...",
  "socialProof": "...",
  "cta": "...",
  "closing": "...",
  "signature": "...",
  "ps": "...",
  "plainTextBody": "Full plain text version",
  "htmlBody": "<html><body><p>Full HTML version</p></body></html>"
}

CRITICAL RULES:
1. Use ONLY the verified context above. NEVER invent statistics, ROI, conversion rates, or customer counts.
2. NEVER use: "studies show", "research indicates", "industry experts say", "join X+ customers", "trusted by X companies"
3. NEVER fabricate testimonials or case studies.
4. The product name MUST be "${context.productName || 'the product'}" - never generic like "your product" or "our solution".
5. Every feature mentioned MUST come from the Features list above.
6. Every pain point MUST come from the Pain Points list above.
7. Subject line MUST be unique and specific to ${context.productName || 'the product'}.
8. Return ONLY valid JSON. No markdown, no extra text.`;
}

function validateEmailOutput(email, context) {
  const issues = [];
  const productName = context.productName || '';
  const companyName = context.companyName || '';

  if (!email) { issues.push('Email object is null/undefined'); return { valid: false, issues }; }

  const checks = [
    { field: 'subjectLine', check: (v) => v && v.length > 0 && v.length <= 60, msg: 'Missing or too long (max 60)' },
    { field: 'previewText', check: (v) => v && v.length > 0 && v.length <= 100, msg: 'Missing or too long (max 100)' },
    { field: 'opening', check: (v) => v && v.length >= 20, msg: 'Missing or too short (min 20 chars)' },
    { field: 'problem', check: (v) => v && v.length >= 20, msg: 'Missing or too short' },
    { field: 'solution', check: (v) => v && v.length >= 20, msg: 'Missing or too short' },
    { field: 'cta', check: (v) => v && v.length > 0, msg: 'Missing CTA' },
    { field: 'plainTextBody', check: (v) => v && v.length >= 100, msg: 'Missing or too short (min 100 chars)' },
    { field: 'htmlBody', check: (v) => v && v.length >= 100, msg: 'Missing or too short (min 100 chars)' }
  ];

  for (const { field, check, msg } of checks) {
    if (!check(email[field])) {
      issues.push({ field, message: msg });
    }
  }

  if (productName) {
    const subject = (email.subjectLine || '').toLowerCase();
    const body = (email.plainTextBody || '').toLowerCase();
    const productLower = productName.toLowerCase();

    if (!subject.includes(productLower) && !body.includes(productLower)) {
      issues.push({ field: 'product', message: `Email does not mention product: "${productName}"` });
    }

    const genericPatterns = [/your product/i, /our product/i, /this tool/i, /our tool/i, /the software/i, /our software/i, /your software/i, /the platform/i, /our platform/i, /your platform/i, /our solution/i, /your solution/i, /the solution/i, /ai tool/i, /ai platform/i, /ai solution/i, /ai powered/i];
    for (const pattern of genericPatterns) {
      if (pattern.test(email.plainTextBody || '') || pattern.test(email.subjectLine || '')) {
        issues.push({ field: 'generic', message: `Contains generic placeholder: "${pattern.source}" - use real product name` });
      }
    }
  }

  const fakePatterns = [/studies show/i, /research indicates/i, /industry experts say/i, /join \d+\+/i, /trusted by \d+/i, /\d+% (increase|improvement|reduction|boost)/i, /up to \d+/i, /over \d+ (customers|users|businesses)/i, /our research shows/i];
  for (const pattern of fakePatterns) {
    if (pattern.test(email.plainTextBody || '') || pattern.test(email.htmlBody || '')) {
      issues.push({ field: 'fabricated', message: `Contains fabricated claim: "${pattern.source}"` });
    }
  }

  return {
    valid: issues.length === 0,
    issues,
    sanitized: issues.length > 0 ? sanitizeEmail(email, issues, productName, companyName) : email
  };
}

function sanitizeEmail(email, issues, productName, companyName) {
  const sanitized = { ...email };
  if (!sanitized.subjectLine) sanitized.subjectLine = `Introducing ${productName || 'Our Platform'}`;
  if (!sanitized.previewText) sanitized.previewText = `Learn how ${productName || 'we'} can help your business`;
  if (!sanitized.plainTextBody) sanitized.plainTextBody = `Hello,\n\nThank you for your interest in ${productName || 'our platform'}.\n\nBest regards,\n${companyName || 'The Team'}`;
  if (!sanitized.htmlBody) sanitized.htmlBody = `<html><body><p>Hello,</p><p>Thank you for your interest in ${productName || 'our platform'}.</p><p>Best regards,<br/>${companyName || 'The Team'}</p></body></html>`;

  const genericPatterns = [/your product/gi, /our product/gi, /this tool/gi, /our tool/gi, /the software/gi, /our software/gi, /your software/gi, /the platform/gi, /our platform/gi, /your platform/gi, /our solution/gi, /your solution/gi, /the solution/gi, /ai tool/gi, /ai platform/gi, /ai solution/gi];
  for (const pattern of genericPatterns) {
    const replacement = productName || 'our platform';
    if (sanitized.plainTextBody) sanitized.plainTextBody = sanitized.plainTextBody.replace(pattern, replacement);
    if (sanitized.htmlBody) sanitized.htmlBody = sanitized.htmlBody.replace(pattern, replacement);
    if (sanitized.subjectLine) sanitized.subjectLine = sanitized.subjectLine.replace(pattern, replacement);
  }

  return sanitized;
}

function buildResponsiveHTML(email) {
  const body = email.plainTextBody || email.htmlBody || '';
  const subject = email.subjectLine || '';
  const previewText = email.previewText || '';

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  <style>
    /* Reset */
    body, table, td, p, a, li, blockquote { -webkit-text-size-adjust: 100%; -ms-text-size-adjust: 100%; }
    table, td { mso-table-lspace: 0pt; mso-table-rspace: 0pt; }
    img { -ms-interpolation-mode: bicubic; border: 0; height: auto; line-height: 100%; outline: none; text-decoration: none; }
    body { margin: 0; padding: 0; width: 100% !important; height: 100% !important; }
    /* Container */
    .email-container { max-width: 600px; margin: 0 auto; padding: 20px; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; font-size: 16px; line-height: 1.6; color: #333333; background-color: #ffffff; }
    /* Header */
    .email-header { text-align: center; padding: 20px 0; border-bottom: 1px solid #e0e0e0; margin-bottom: 20px; }
    .email-header h1 { font-size: 24px; margin: 0; color: #111111; }
    .preview-text { display: none; font-size: 1px; color: #ffffff; line-height: 1px; max-height: 0px; max-width: 0px; opacity: 0; overflow: hidden; }
    /* Body */
    .email-body { padding: 20px 0; }
    .email-body p { margin: 0 0 16px 0; }
    /* CTA */
    .cta-button { display: inline-block; padding: 14px 32px; background-color: #0066ff; color: #ffffff !important; text-decoration: none; border-radius: 6px; font-weight: 600; font-size: 16px; margin: 16px 0; }
    .cta-button:hover { background-color: #0052cc; }
    /* Footer */
    .email-footer { text-align: center; padding: 20px 0; border-top: 1px solid #e0e0e0; margin-top: 20px; font-size: 14px; color: #888888; }
    /* Responsive */
    @media screen and (max-width: 600px) { .email-container { width: 100% !important; padding: 10px !important; } .cta-button { display: block !important; text-align: center !important; } }
    @media (prefers-color-scheme: dark) { .email-container { background-color: #1a1a1a; color: #e0e0e0; } .email-header { border-bottom-color: #333; } .email-header h1 { color: #ffffff; } .email-footer { border-top-color: #333; color: #888; } .cta-button { background-color: #3388ff; } }
  </style>
</head>
<body>
  <div class="preview-text">${previewText}</div>
  <div class="email-container">
    <div class="email-header">
      <h1>${subject}</h1>
    </div>
    <div class="email-body">
      ${body.replace(/\n/g, '<br/>')}
    </div>
    <div class="email-footer">
      <p>If you have any questions, please reply to this email.</p>
      <p>&copy; ${new Date().getFullYear()} ${previewText.includes('@') ? '' : 'All rights reserved.'}</p>
    </div>
  </div>
</body>
</html>`;
}

function buildPreviewData(email) {
  const plainText = email.plainTextBody || '';
  const htmlBody = email.htmlBody || '';
  const responsiveHTML = buildResponsiveHTML(email);
  const words = plainText.split(/\s+/).filter(Boolean);
  const readingTime = Math.max(1, Math.round(words.length / 200));

  return {
    subjectLine: email.subjectLine || '',
    previewText: email.previewText || '',
    desktopPreview: {
      html: htmlBody,
      responsiveHTML,
      characters: htmlBody.length,
      words: words.length,
      readingTimeMinutes: readingTime
    },
    mobilePreview: {
      html: responsiveHTML,
      responsiveHTML,
      characters: responsiveHTML.length,
      words: words.length,
      readingTimeMinutes: readingTime
    },
    plainText: {
      text: plainText,
      characters: plainText.length,
      words: words.length,
      readingTimeMinutes: readingTime
    },
    htmlPreview: {
      html: htmlBody,
      responsiveHTML,
      characters: htmlBody.length
    }
  };
}

export async function generateEmailCampaign({ chatId, userId, planId, campaignPlanId, emailType = 'campaign' }) {
  try {
    const plan = await prisma.campaignPlan.findUnique({
      where: { id: planId || campaignPlanId },
      include: { chat: true }
    });

    if (!plan) throw new Error('Campaign plan not found');

    const [productIntelligence, seoData, competitorIntelligence, audienceData] = await Promise.allSettled([
      prisma.productIntelligence.findUnique({ where: { chatId } }),
      prisma.seoIntelligence.findUnique({ where: { chatId } }),
      prisma.competitorIntelligence.findUnique({ where: { chatId } }),
      prisma.campaignIntelligence.findUnique({ where: { chatId } })
    ]);

    const context = buildRichContext(
      plan,
      { website: {}, product: {}, company: {}, audience: {}, competitors: {}, seo: {} },
      productIntelligence.status === 'fulfilled' ? productIntelligence.value : null,
      seoData.status === 'fulfilled' ? seoData.value : null,
      null,
      audienceData.status === 'fulfilled' ? audienceData.value : null,
      competitorIntelligence.status === 'fulfilled' ? competitorIntelligence.value : null
    );

    const prompt = buildAIPrompt(context, emailType);

    const aiResult = await callAI([
      { role: 'system', content: 'You are a Senior Email Marketing Strategist. Return ONLY valid JSON with no markdown formatting.' },
      { role: 'user', content: prompt }
    ], { responseFormat: 'json', temperature: 0.8 });

    let emailData;
    try {
      emailData = typeof aiResult === 'string' ? JSON.parse(aiResult) : (aiResult?.data || aiResult);
    } catch (e) {
      console.warn('[EmailCampaign] AI response parse failed, generating structured email');
      emailData = generateFallbackEmail(context);
    }

    const validation = validateEmailOutput(emailData, context);

    if (!validation.valid) {
      console.warn('[EmailCampaign] Validation issues:', validation.issues);
    }

    const finalEmail = validation.sanitized || emailData;
    const preview = buildPreviewData(finalEmail);

    const campaignRecord = await prisma.emailCampaign.upsert({
      where: { id: `${chatId}_${planId || campaignPlanId}` },
      create: {
        chatId, userId,
        campaignPlanId: planId || campaignPlanId,
        name: `${context.productName || 'Product'} - ${new Date().toLocaleDateString()}`,
        status: 'draft',
        sequenceItems: {
          create: [{
            sequenceOrder: 1,
            emailName: `Email 1: ${finalEmail.subjectLine || 'Campaign Email'}`,
            purpose: 'campaign',
            subjectLine: finalEmail.subjectLine || '',
            alternativeSubjectLines: [],
            previewText: finalEmail.previewText || '',
            emailBodyText: finalEmail.plainTextBody || '',
            emailBodyHtml: finalEmail.htmlBody || '',
            responsiveHtml: buildResponsiveHTML(finalEmail),
            primaryCta: finalEmail.cta || '',
            personalizationFields: ['{{firstName}}', '{{companyName}}'],
            inferenceStatus: 'EVIDENCE_BACKED',
            preview: preview
          }]
        }
      },
      update: {
        status: 'draft',
        updatedAt: new Date()
      }
    });

    return {
      success: true,
      data: {
        email: finalEmail,
        preview,
        validation,
        context: {
          productName: context.productName,
          companyName: context.companyName,
          targetAudience: context.targetAudience
        },
        campaignId: campaignRecord?.id || null
      }
    };
  } catch (error) {
    console.error('[EmailCampaign] Generate failed:', error);
    return { success: false, error: error.message };
  }
}

function generateFallbackEmail(context) {
  const product = context.productName || 'our platform';
  const company = context.companyName || 'our team';
  const painPoint = context.audiencePainPoints[0] || 'common challenges';
  const feature = context.productFeatures[0] || 'powerful features';
  const competitor = context.competitorNames[0] || '';

  return {
    subjectLine: `How ${product} Solves ${painPoint.substring(0, 30)}`,
    previewText: `Discover how ${product} helps ${context.targetAudience || 'businesses'} overcome ${painPoint.substring(0, 20)}`,
    opening: `Are you tired of dealing with ${painPoint}? You're not alone.`,
    problem: `Many ${context.targetAudience || 'businesses'} struggle with ${painPoint}, spending valuable time and resources on manual processes.`,
    solution: `${product} by ${company} is designed to help you overcome these challenges with ${feature}.`,
    features: `With ${product}, you get:\n- ${feature}\n- Streamlined workflows\n- Real-time insights\n- Seamless integrations`,
    benefits: `By using ${product}, you can:\n- Save time and reduce manual work\n- Improve team collaboration\n- Make data-driven decisions\n- Scale your operations efficiently`,
    socialProof: `${product} is trusted by innovative companies to transform their operations.`,
    cta: `Try ${product} Free Today`,
    closing: `Ready to see what ${product} can do for you?`,
    signature: `Best regards,\nThe ${company} Team`,
    ps: `P.S. Start your free trial today and experience the difference ${product} can make.`,
    plainTextBody: `Hello,\n\nAre you tired of dealing with ${painPoint}? You're not alone.\n\nMany ${context.targetAudience || 'businesses'} struggle with these challenges. That's where ${product} comes in.\n\n${product} by ${company} helps you:\n- ${feature}\n- Streamline operations\n- Save time and resources\n- Drive better results\n\n${context.competitorNames.length > 0 ? `Unlike ${competitor}, ${product} is designed specifically for your needs.` : ''}\n\nReady to get started? Try ${product} today.\n\nBest regards,\nThe ${company} Team\n\nP.S. Start your free trial and see the difference.`,
    htmlBody: `<html><body><p>Hello,</p><p>Are you tired of dealing with ${painPoint}? You're not alone.</p><p>Many ${context.targetAudience || 'businesses'} struggle with these challenges. That's where ${product} comes in.</p><p><strong>${product}</strong> by ${company} helps you:</p><ul><li>${feature}</li><li>Streamline operations</li><li>Save time and resources</li><li>Drive better results</li></ul><p>Ready to get started? Try ${product} today.</p><p>Best regards,<br/>The ${company} Team</p><p>P.S. Start your free trial and see the difference.</p></body></html>`
  };
}

export async function sendCampaignEmail({ campaignId, itemId, recipientEmail, recipientName, companyName }) {
  try {
    const item = await prisma.emailSequenceItem.findUnique({ where: { id: itemId } });
    if (!item) throw new Error('Email item not found');

    const personalizedBody = (item.emailBodyText || '')
      .replace(/{{firstName}}/g, recipientName || 'there')
      .replace(/{{companyName}}/g, companyName || '');

    const personalizedHtml = (item.responsiveHtml || item.emailBodyHtml || '')
      .replace(/{{firstName}}/g, recipientName || 'there')
      .replace(/{{companyName}}/g, companyName || '');

    const sentResult = await sendEmail({
      to: recipientEmail,
      subject: item.subjectLine || '',
      text: personalizedBody,
      html: personalizedHtml
    });

    await prisma.emailCampaignLog.create({
      data: {
        emailCampaignId: campaignId,
        sequenceItemId: itemId,
        recipientEmail,
        status: sentResult.success ? 'sent' : 'failed',
        error: sentResult.error || null,
        metadata: { provider: sentResult.provider, timestamp: new Date().toISOString() }
      }
    }).catch(() => {});

    return sentResult;
  } catch (error) {
    console.error('[EmailCampaign] Send failed:', error);
    return { success: false, error: error.message };
  }
}

export async function scheduleCampaign({ campaignId, scheduledDate }) {
  try {
    const campaign = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { scheduledAt: new Date(scheduledDate), status: 'scheduled' }
    });
    return { success: true, data: campaign };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function approveCampaign(campaignId) {
  try {
    const campaign = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: 'approved', approvedAt: new Date() }
    });
    return { success: true, data: campaign };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
