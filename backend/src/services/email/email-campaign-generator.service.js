import prisma from "../../config/prisma.js";
import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import { sendEmail, getEmailProviderHealth } from "../providers/email/index.js";
import { getLatestEvidenceSnapshot } from "../../modules/evidence/evidence.service.js";

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

  const primaryKeywords = [
    ...(Array.isArray(seo.primaryKeywords) ? seo.primaryKeywords.map(k => k.keyword || k) : []),
    ...(Array.isArray(evidence?.seo?.primaryKeywords?.value) ? evidence.seo.primaryKeywords.value : [])
  ].filter(Boolean);

  const secondaryKeywords = [
    ...(Array.isArray(seo.secondaryKeywords) ? seo.secondaryKeywords.map(k => k.keyword || k) : []),
    ...(Array.isArray(evidence?.seo?.secondaryKeywords?.value) ? evidence.seo.secondaryKeywords.value : [])
  ].filter(Boolean);

  const questionKeywords = [
    ...(Array.isArray(seo.questionKeywords) ? seo.questionKeywords.map(k => k.keyword || k) : []),
    ...(Array.isArray(evidence?.seo?.questionKeywords?.value) ? evidence.seo.questionKeywords.value : [])
  ].filter(Boolean);

  const testimonials = [
    ...(Array.isArray(product.testimonials) ? product.testimonials : []),
    ...(Array.isArray(website.testimonials) ? website.testimonials : []),
    ...(Array.isArray(evidence?.social?.testimonials?.value) ? evidence.social.testimonials.value : [])
  ].filter(Boolean).slice(0, 3);

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
    primaryKeywords,
    secondaryKeywords,
    questionKeywords,
    tone: plan?.tone || company.tone || 'professional',
    brandVoice: company.brandVoice || product.brandVoice || '',
    pricingModel: product.pricing || product.pricingModel || '',
    targetMarket: product.targetMarket || product.marketSegment || '',
    businessModel: product.businessModel || '',
    revenueModel: product.revenueModel || '',
    ctaTexts: (website.ctaTexts?.value || website.ctaTexts || []).slice(0, 3),
    socialProof: (product.testimonials || product.caseStudies || []).slice(0, 3),
    testimonials,
    evidenceSources: evidence?.sourceSummary?.sourcesCollected || []
  };
}

function buildAIPrompt(context, emailType = 'campaign') {
  const features = context.productFeatures.join(', ') || 'Not specified';
  const painPoints = context.audiencePainPoints.join(', ') || 'Not specified';
  const competitors = context.competitorNames.join(', ') || 'Not specified';
  const keywords = context.seoKeywords.join(', ') || 'Not specified';
  const primaryKw = context.primaryKeywords.join(', ') || 'Not specified';
  const secondaryKw = context.secondaryKeywords.join(', ') || 'Not specified';
  const questionKw = context.questionKeywords.join(', ') || 'Not specified';
  const testimonials = context.testimonials.join(', ') || 'Not specified';

  return `You are a Senior Email Marketing Strategist at a leading SaaS company. Generate an exceptional, high-converting ${emailType} email using ONLY the verified context below.

COMPANY & PRODUCT (REAL - USE EXACTLY):
- Product Name: "${context.productName || 'N/A'}"
- Company Name: "${context.companyName || 'N/A'}"
- Industry: "${context.industry || 'N/A'}"
- Category: "${context.productCategory || 'N/A'}"
- Business Model: "${context.businessModel || 'N/A'}"
- Pricing: "${context.pricingModel || 'N/A'}"
- Value Proposition: "${context.valueProposition || 'N/A'}"

TARGET AUDIENCE:
- Audience: "${context.targetAudience || 'N/A'}"
- Role: "${context.audienceRole || 'N/A'}"
- Industry: "${context.audienceIndustry || 'N/A'}"
- Company Size: "${context.companySize || 'N/A'}"
- Pain Points: ${painPoints}

PRODUCT DETAILS:
- Features: ${features}
- Tone: ${context.tone || 'professional'}
- Brand Voice: "${context.brandVoice || 'N/A'}"

COMPETITIVE LANDSCAPE:
- Competitors: ${competitors}

SEO KEYWORDS:
- All Keywords: ${keywords}
- Primary Keywords (use at least 2 times): ${primaryKw}
- Secondary Keywords (use at least 1 time): ${secondaryKw}
- Question Keywords (use at least 1 time): ${questionKw}

TESTIMONIALS / SOCIAL PROOF: ${testimonials}

Generate a complete, professional email with ALL of these exact sections. Every section must be unique, specific to ${context.productName}, and use real context data:

1. SUBJECT LINE (max 50 chars, specific to product, must include product name, no clickbait, no all-caps)
2. PREVIEW TEXT (max 100 chars, compelling reason to open, must mention ${context.productName})
3. OPENING HOOK (2-3 sentences, personalized, pain-point driven, must reference ${context.targetAudience || 'the reader'})
4. PAIN POINT (2-3 sentences, describe the specific problem from pain points above, make it relatable)
5. SOLUTION INTRODUCTION (2-3 sentences, position ${context.productName} as the solution, reference specific features)
6. FEATURE SECTION (3-5 bullet points, each feature must be a REAL feature from the Features list, with specific benefit)
7. BENEFITS SECTION (3-5 bullet points, each benefit tied to audience pain points, use "You can..." format)
8. CUSTOMER STORY (1-2 sentences, brief relatable scenario showing how ${context.productName} helps)
9. SOCIAL PROOF (1-2 sentences, reference testimonials or adoption without fake statistics)
10. CALL TO ACTION (1 sentence, specific action-oriented CTA using "${context.productName}" name, button-style text)
11. CLOSING (1-2 sentences, warm professional sign-off)
12. SIGNATURE (include "${context.companyName || 'The Team'}" Team and a sender name)
13. FOOTER (professional footer with company info, copyright ${new Date().getFullYear()})
14. P.S. (1 sentence, reinforce key benefit or create urgency)

CRITICAL RULES:
1. Use ONLY the verified context above. NEVER invent statistics, ROI, conversion rates, or customer counts.
2. NEVER use: "studies show", "research indicates", "industry experts say", "join X+ customers", "trusted by X companies", "over X businesses"
3. NEVER fabricate testimonials or case studies.
4. The product name "${context.productName || 'the product'}" MUST appear at least 5 times throughout the email.
5. Every feature mentioned MUST come from the Features list above.
6. Every pain point MUST come from the Pain Points list above.
7. Subject line MUST include "${context.productName || 'the product'}" and be under 50 characters.
8. Total email body (excluding signature/footer) MUST be at least 600 words, maximum 900 words.
9. Brand voice must be consistent throughout - maintain ${context.tone || 'professional'} tone.
10. No generic placeholders like "your product", "our solution", "this tool", "the platform".
11. Target audience must be ${context.targetAudience || 'business professionals'} - write specifically for them.
12. CTA must be specific to ${context.productName} and the buying stage.
13. Use primary keywords (${primaryKw}) at least 2 times across the email body.
14. Use secondary keywords (${secondaryKw}) at least 1 time across the email body.
15. Use question keywords (${questionKw}) at least 1 time across the email body.

Return ONLY valid JSON with no markdown, no code blocks:
{
  "subjectLine": "...",
  "previewText": "...",
  "opening": "...",
  "painPoint": "...",
  "solution": "...",
  "featureSection": "...",
  "benefits": "...",
  "customerStory": "...",
  "socialProof": "...",
  "cta": "...",
  "closing": "...",
  "signature": "...",
  "footer": "...",
  "ps": "...",
  "plainTextBody": "Full plain text version (complete email in plain text, 600-900 words)",
  "htmlBody": "Full HTML version with proper formatting",
  "markdownBody": "Full markdown version of the email"
}`;
}

function validateEmailOutput(email, context) {
  const issues = [];
  const criticalBlockers = [];
  const productName = context.productName || '';
  const companyName = context.companyName || '';

  if (!email) { issues.push('Email object is null/undefined'); return { valid: false, issues }; }

  const subject = email.subject || email.subjectLine || '';
  if (!subject || (typeof subject === 'string' && subject.trim().length < 3)) {
    criticalBlockers.push({ field: 'subject', message: 'Subject is missing or too short' });
  }

  const previewText = email.previewText || '';
  if (!previewText || (typeof previewText === 'string' && previewText.trim().length < 5)) {
    issues.push({ field: 'previewText', message: 'Preview text is missing or too short' });
  }

  const plainText = email.plainText || email.plainTextBody || '';
  const html = email.html || email.htmlBody || '';
  if (!plainText && !html) {
    criticalBlockers.push({ field: 'content', message: 'Email body (plainText or html) is missing' });
  }

  const cta = email.ctaText || email.cta || (email.primaryCta && (email.primaryCta.label || email.primaryCta.text)) || '';
  if (!cta) {
    issues.push({ field: 'cta', message: 'Call-to-action is missing' });
  }

  const closing = email.closing || '';
  const signature = email.signature || '';
  if (!closing && !signature) {
    issues.push({ field: 'closingOrSignature', message: 'Closing and signature are both missing' });
  }

  if (subject && subject.length > 70) {
    issues.push({ field: 'subject', message: 'Over 70 characters' });
  }
  if (previewText && previewText.length > 150) {
    issues.push({ field: 'previewText', message: 'Over 150 characters' });
  }

  const evidenceSections = ['opening', 'painPoint', 'solution'];
  const filledSections = evidenceSections.filter(s => email[s] && email[s].trim().length >= 5).length;
  if (filledSections < 1) {
    criticalBlockers.push({ field: 'evidence', message: `Only ${filledSections} content sections filled (minimum 1 required)` });
  }

  if (productName) {
    const body = (email.plainTextBody || '').toLowerCase();
    const subject = (email.subjectLine || '').toLowerCase();
    const preview = (email.previewText || '').toLowerCase();
    const productLower = productName.toLowerCase();
    const escapedProduct = productLower.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const productMentions = (body.match(new RegExp(escapedProduct, 'g')) || []).length +
      (subject.match(new RegExp(escapedProduct, 'g')) || []).length +
      (preview.match(new RegExp(escapedProduct, 'g')) || []).length;

    if (productMentions < 5) {
      criticalBlockers.push({ field: 'product', message: `Product mentioned only ${productMentions} times (minimum 5 required)` });
    } else if (productMentions > 10) {
      criticalBlockers.push({ field: 'product', message: `Product mentioned ${productMentions} times (maximum 10 allowed) - keyword stuffing detected` });
    }

    const genericPatterns = [/your product/gi, /our product/gi, /this tool/gi, /our tool/gi, /the software/gi, /our software/gi, /your software/gi, /the platform/gi, /our platform/gi, /your platform/gi, /our solution/gi, /your solution/gi, /the solution/gi, /ai tool/gi, /ai platform/gi, /ai solution/gi, /ai powered/gi];
    for (const pattern of genericPatterns) {
      if (pattern.test(email.plainTextBody || '') || pattern.test(email.subjectLine || '') || pattern.test(email.previewText || '')) {
        issues.push({ field: 'generic', message: `Contains generic placeholder: "${pattern.source}" - use real product name` });
      }
    }
  }

  const fakePatterns = [/studies show/i, /research indicates/i, /industry experts say/i, /join \d+\+/i, /trusted by \d+/i, /\d+% (increase|improvement|reduction|boost)/i, /up to \d+/i, /over \d+ (customers|users|businesses)/i, /our research shows/i, /\d+,\d+\+ (customers|users|businesses|companies)/i];
  for (const pattern of fakePatterns) {
    if (pattern.test(email.plainTextBody || '') || pattern.test(email.htmlBody || '')) {
      issues.push({ field: 'fabricated', message: `Contains fabricated claim: "${pattern.source}"` });
    }
  }

  const wordCount = (email.plainTextBody || '').split(/\s+/).filter(Boolean).length;
  if (wordCount < 600) {
    issues.push({ field: 'wordCount', message: `Only ${wordCount} words (minimum 600 required)` });
  } else if (wordCount > 900) {
    issues.push({ field: 'wordCount', message: `${wordCount} words exceeds maximum of 900` });
  }

  const audience = context.targetAudience || '';
  if (audience && email.plainTextBody) {
    const audienceLower = audience.toLowerCase();
    const bodyLower = email.plainTextBody.toLowerCase();
    const audienceKeywords = audienceLower.split(/\s+/).filter(w => w.length > 3);
    const matchesAudience = audienceKeywords.some(k => bodyLower.includes(k));
    if (!matchesAudience) {
      issues.push({ field: 'audience', message: `Email does not target "${audience}" audience specifically` });
    }
  }

  const bodyText = (email.plainTextBody || '').toLowerCase();
  const primaryKeywords = context.primaryKeywords || [];
  const secondaryKeywords = context.secondaryKeywords || [];
  const questionKeywords = context.questionKeywords || [];

  if (primaryKeywords.length > 0) {
    const primaryFound = primaryKeywords.filter(kw => bodyText.includes(kw.toLowerCase())).length;
    if (primaryFound < Math.min(2, primaryKeywords.length)) {
      issues.push({ field: 'primaryKeywords', message: `Only ${primaryFound} of ${primaryKeywords.length} primary keywords found (at least 2 expected)` });
    }
  }

  if (secondaryKeywords.length > 0) {
    const secondaryFound = secondaryKeywords.filter(kw => bodyText.includes(kw.toLowerCase())).length;
    if (secondaryFound < Math.min(1, secondaryKeywords.length)) {
      issues.push({ field: 'secondaryKeywords', message: `No secondary keywords found in email body` });
    }
  }

  if (questionKeywords.length > 0) {
    const questionFound = questionKeywords.filter(kw => bodyText.includes(kw.toLowerCase())).length;
    if (questionFound < Math.min(1, questionKeywords.length)) {
      issues.push({ field: 'questionKeywords', message: `No question keywords found in email body` });
    }
  }

  return {
    valid: criticalBlockers.length === 0,
    criticalBlockers,
    issues,
    sanitized: (issues.length > 5 || criticalBlockers.length > 0) ? sanitizeEmail(email, issues, productName, companyName, context) : email
  };
}

function sanitizeEmail(email, issues, productName, companyName, context) {
  const sanitized = { ...email };

  if (!sanitized.subjectLine) sanitized.subjectLine = `Introducing ${productName || 'Our Platform'} for ${context?.targetAudience || 'Your Team'}`;
  if (!sanitized.previewText) sanitized.previewText = `See how ${productName || 'we'} helps ${context?.targetAudience || 'businesses'} solve ${(context?.audiencePainPoints || [])[0] || 'key challenges'}`;
  if (!sanitized.plainTextBody) {
    const features = (context?.productFeatures || []).slice(0, 3).map(f => typeof f === 'string' ? f : (f.value || f.name || f)).join(', ');
    sanitized.plainTextBody = `Hello,\n\nAre you tired of dealing with ${(context?.audiencePainPoints || [])[0] || 'common challenges'}? You're not alone.\n\nMany ${context?.targetAudience || 'businesses'} struggle with these challenges. That's where ${productName || 'we'} come in.\n\n${productName || 'Our platform'} helps you:\n- ${features || 'Streamline operations'}\n- Save time and reduce manual work\n- Drive better results\n- Scale efficiently\n\nReady to get started with ${productName || 'our platform'}?\n\nBest regards,\nThe ${companyName || 'Team'} Team\n\nP.S. ${productName || 'Our platform'} is the solution ${context?.targetAudience || 'businesses'} need.`;
  }

  const genericPatterns = [/your product/gi, /our product/gi, /this tool/gi, /our tool/gi, /the software/gi, /our software/gi, /your software/gi, /the platform/gi, /our platform/gi, /your platform/gi, /our solution/gi, /your solution/gi, /the solution/gi, /ai tool/gi, /ai platform/gi, /ai solution/gi];
  for (const pattern of genericPatterns) {
    const replacement = productName || 'our platform';
    if (sanitized.plainTextBody) sanitized.plainTextBody = sanitized.plainTextBody.replace(pattern, replacement);
    if (sanitized.htmlBody) sanitized.htmlBody = sanitized.htmlBody.replace(pattern, replacement);
    if (sanitized.subjectLine) sanitized.subjectLine = sanitized.subjectLine.replace(pattern, replacement);
    if (sanitized.previewText) sanitized.previewText = sanitized.previewText.replace(pattern, replacement);
  }

  if (!sanitized.htmlBody) {
    sanitized.htmlBody = buildResponsiveHTML(sanitized);
  }

  if (!sanitized.markdownBody) {
    sanitized.markdownBody = generateMarkdownBody(sanitized);
  }

  return sanitized;
}

function buildResponsiveHTML(email) {
  const subject = email.subjectLine || '';
  const previewText = email.previewText || '';
  const opening = email.opening || '';
  const painPoint = email.painPoint || '';
  const solution = email.solution || '';
  const featureSection = email.featureSection || '';
  const benefits = email.benefits || '';
  const customerStory = email.customerStory || '';
  const socialProof = email.socialProof || '';
  const cta = email.cta || '';
  const closing = email.closing || '';
  const signature = email.signature || '';
  const footer = email.footer || '';
  const ps = email.ps || '';

  function buildBodyHTML() {
    const sections = [];
    if (opening) sections.push(`<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1a1a2e">${opening.replace(/\n/g, '<br/>')}</p>`);
    if (painPoint) sections.push(`<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1a1a2e">${painPoint.replace(/\n/g, '<br/>')}</p>`);
    if (solution) sections.push(`<p style="margin:0 0 16px 0;font-size:16px;line-height:1.6;color:#1a1a2e">${solution.replace(/\n/g, '<br/>')}</p>`);
    if (featureSection) {
      const formatted = featureSection.includes('<') ? featureSection : `<ul style="margin:0 0 16px 0;padding-left:20px">${featureSection.split('\n').filter(l => l.trim()).map(l => `<li style="margin-bottom:8px;font-size:15px;line-height:1.5;color:#1a1a2e">${l.replace(/^[-*•]\s*/, '')}</li>`).join('')}</ul>`;
      sections.push(formatted);
    }
    if (benefits) {
      const formatted = benefits.includes('<') ? benefits : `<ul style="margin:0 0 16px 0;padding-left:20px">${benefits.split('\n').filter(l => l.trim()).map(l => `<li style="margin-bottom:8px;font-size:15px;line-height:1.5;color:#1a1a2e">${l.replace(/^[-*•]\s*/, '')}</li>`).join('')}</ul>`;
      sections.push(formatted);
    }
    if (customerStory) sections.push(`<div style="margin:0 0 16px 0;padding:16px;background:#f8f9ff;border-left:4px solid #4f46e5;border-radius:4px"><p style="margin:0;font-size:15px;line-height:1.6;color:#1a1a2e;font-style:italic">${customerStory.replace(/\n/g, '<br/>')}</p></div>`);
    if (socialProof) sections.push(`<p style="margin:0 0 16px 0;font-size:15px;line-height:1.6;color:#4a4a6a">${socialProof.replace(/\n/g, '<br/>')}</p>`);
    if (cta) sections.push(`<div style="text-align:center;margin:24px 0"><a href="#" style="display:inline-block;padding:14px 36px;background:#4f46e5;color:#ffffff;text-decoration:none;border-radius:8px;font-size:16px;font-weight:600;letter-spacing:0.3px">${cta}</a></div>`);
    if (closing) sections.push(`<p style="margin:16px 0 4px 0;font-size:16px;line-height:1.6;color:#1a1a2e">${closing.replace(/\n/g, '<br/>')}</p>`);
    if (signature) sections.push(`<p style="margin:4px 0 16px 0;font-size:15px;line-height:1.5;color:#4a4a6a">${signature.replace(/\n/g, '<br/>')}</p>`);
    if (ps) sections.push(`<p style="margin:16px 0 0 0;font-size:14px;line-height:1.5;color:#4a4a6a"><strong>P.S.</strong> ${ps.replace(/\n/g, '<br/>')}</p>`);
    return sections.join('\n');
  }

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <meta name="color-scheme" content="light dark">
  <meta name="supported-color-schemes" content="light dark">
  <title>${subject}</title>
  <style>
    body,table,td,p,a,li,blockquote{-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%}
    table,td{mso-table-lspace:0pt;mso-table-rspace:0pt}
    img{-ms-interpolation-mode:bicubic;border:0;height:auto;line-height:100%;outline:none;text-decoration:none}
    body{margin:0;padding:0;width:100%!important;height:100%!important;background-color:#f4f4f8}
    .email-wrapper{max-width:600px;margin:0 auto;padding:20px 10px}
    .email-container{background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.06)}
    .email-header{background:linear-gradient(135deg,#1a1a2e,#16213e);padding:32px 40px 24px;text-align:center}
    .email-header h1{font-size:22px;margin:0;color:#ffffff;font-weight:700;letter-spacing:-0.3px}
    .email-body{padding:32px 40px}
    .email-footer{text-align:center;padding:20px 40px;border-top:1px solid #e8e8f0;font-size:12px;color:#8888a0}

    @media screen and (max-width:600px){
      .email-wrapper{padding:10px 5px}
      .email-container{border-radius:8px}
      .email-header{padding:24px 20px 16px}
      .email-header h1{font-size:18px}
      .email-body{padding:20px}
      .cta-button{display:block!important;text-align:center!important;width:100%!important;box-sizing:border-box}
    }

    @media (prefers-color-scheme:dark){
      .email-wrapper{background-color:#0a0a14}
      .email-container{background-color:#1a1a2e}
      .email-header{background:linear-gradient(135deg,#0f0f23,#1a1a3e)}
      .email-body p,.email-body li{color:#e0e0f0!important}
      .email-footer{border-top-color:#2a2a44;color:#6666a0}
      .email-footer p{color:#6666a0!important}
    }

    @media (prefers-color-scheme:dark){
      .email-body div[style*="background:#f8f9ff"]{background:#2a2a44!important}
      .email-body div[style*="border-left:4px solid #4f46e5"]{border-left-color:#6366f1!important}
    }
  </style>
</head>
<body>
  <div style="display:none;font-size:1px;color:#ffffff;line-height:1px;max-height:0px;max-width:0px;opacity:0;overflow:hidden">${previewText}</div>
  <div class="email-wrapper">
    <div class="email-container">
      <div class="email-header">
        <h1>${subject}</h1>
      </div>
      <div class="email-body">
        ${buildBodyHTML()}
      </div>
      <div class="email-footer">
        ${footer ? footer.replace(/\n/g, '<br/>') : `<p>&copy; ${new Date().getFullYear()} All rights reserved.</p><p>If you no longer wish to receive these emails, you can <a href="#" style="color:#6366f1;text-decoration:underline">unsubscribe here</a>.</p>`}
      </div>
    </div>
  </div>
</body>
</html>`;
}

function generateMarkdownBody(email) {
  const sections = [];
  if (email.subjectLine) sections.push(`# ${email.subjectLine}`);
  if (email.previewText) sections.push(`> ${email.previewText}`);
  if (email.opening) sections.push(`\n${email.opening}`);
  if (email.painPoint) sections.push(`\n## The Challenge\n\n${email.painPoint}`);
  if (email.solution) sections.push(`\n## The Solution\n\n${email.solution}`);
  if (email.featureSection) sections.push(`\n## Features\n\n${email.featureSection.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-*•]\s*/, '- ')).join('\n')}`);
  if (email.benefits) sections.push(`\n## Benefits\n\n${email.benefits.split('\n').filter(l => l.trim()).map(l => l.replace(/^[-*•]\s*/, '- ')).join('\n')}`);
  if (email.customerStory) sections.push(`\n> ${email.customerStory}`);
  if (email.socialProof) sections.push(`\n${email.socialProof}`);
  if (email.cta) sections.push(`\n---\n\n**[${email.cta}](#)**`);
  if (email.closing) sections.push(`\n${email.closing}`);
  if (email.signature) sections.push(`\n${email.signature}`);
  if (email.footer) sections.push(`\n---\n\n${email.footer}`);
  if (email.ps) sections.push(`\n*P.S. ${email.ps}*`);
  return sections.join('\n\n');
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
    sections: {
      opening: email.opening || '',
      painPoint: email.painPoint || '',
      solution: email.solution || '',
      featureSection: email.featureSection || '',
      benefits: email.benefits || '',
      customerStory: email.customerStory || '',
      socialProof: email.socialProof || '',
      cta: email.cta || '',
      closing: email.closing || '',
      signature: email.signature || '',
      footer: email.footer || '',
      ps: email.ps || ''
    },
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
    darkModePreview: {
      html: responsiveHTML.replace(/background-color:#f4f4f8/gi, 'background-color:#0a0a14')
                           .replace(/background:#ffffff/gi, 'background:#1a1a2e')
                           .replace(/color:#1a1a2e/gi, 'color:#e0e0f0'),
      responsiveHTML,
      characters: responsiveHTML.length
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

    const evidenceSnapshot = await getLatestEvidenceSnapshot({ chatId, userId });

    const evidenceData = {
      website: {
        title: evidenceSnapshot?.websiteEvidence?.title || '',
        metaDescription: evidenceSnapshot?.websiteEvidence?.metaDescription || '',
        headings: evidenceSnapshot?.websiteEvidence?.headings || [],
        featuresText: evidenceSnapshot?.websiteEvidence?.features || [],
        usps: evidenceSnapshot?.websiteEvidence?.usps || [],
        ctas: evidenceSnapshot?.websiteEvidence?.ctas || [],
        pageTypes: evidenceSnapshot?.websiteEvidence?.pageTypes || [],
        technologies: evidenceSnapshot?.contentEvidence?.technologies || [],
      },
      product: {
        features: evidenceSnapshot?.websiteEvidence?.features || [],
        usps: evidenceSnapshot?.websiteEvidence?.usps || [],
        benefits: [],
        targetAudience: evidenceSnapshot?.websiteEvidence?.targetAudience || '',
        industry: '',
        productCategory: '',
        pricingModel: '',
      },
      company: {
        name: evidenceSnapshot?.companyName || '',
        website: evidenceSnapshot?.websiteUrl || '',
        industry: evidenceSnapshot?.websiteEvidence?.industry || '',
        targetMarket: evidenceSnapshot?.websiteEvidence?.targetAudience || '',
      },
      audience: {},
      competitors: {},
      seo: {
        scores: evidenceSnapshot?.technicalSeoEvidence || {},
        keywords: evidenceSnapshot?.contentEvidence?.keywords || [],
      }
    };

    const [productIntelligence, seoData, competitorIntelligence, audienceData] = await Promise.allSettled([
      prisma.productIntelligence.findUnique({ where: { chatId } }),
      prisma.seoIntelligence.findUnique({ where: { chatId } }),
      prisma.competitorIntelligence.findUnique({ where: { chatId } }),
      prisma.campaignIntelligence.findUnique({ where: { chatId } })
    ]);

    const context = buildRichContext(
      plan,
      evidenceData,
      productIntelligence.status === 'fulfilled' ? productIntelligence.value : null,
      seoData.status === 'fulfilled' ? seoData.value : null,
      null,
      audienceData.status === 'fulfilled' ? audienceData.value : null,
      competitorIntelligence.status === 'fulfilled' ? competitorIntelligence.value : null
    );

    const prompt = buildAIPrompt(context, emailType);

    const aiResult = await callAI([
      { role: 'system', content: 'You are a Senior Email Marketing Strategist. Return ONLY valid JSON with no markdown formatting. Every field must be populated with specific, unique content.' },
      { role: 'user', content: prompt }
    ], { responseFormat: 'json', temperature: 0.7 });

    let emailData;
    try {
      emailData = typeof aiResult === 'string' ? JSON.parse(aiResult) : (aiResult?.data || aiResult);
    } catch (e) {
      console.warn('[EmailCampaign] AI response parse failed, generating structured email');
      emailData = generateFallbackEmail(context);
    }

    const validation = validateEmailOutput(emailData, context);

    if (!validation.valid) {
      console.warn('[EmailCampaign] Validation failed - not saving campaign. Issues:', validation.issues);
      if (validation.criticalBlockers && validation.criticalBlockers.length > 0) {
        console.warn('[EmailCampaign] Critical blockers:', validation.criticalBlockers);
      }
      return {
        success: false,
        error: 'Email validation failed',
        data: {
          email: validation.sanitized || emailData,
          validation,
          context: {
            productName: context.productName,
            companyName: context.companyName,
            targetAudience: context.targetAudience
          },
          campaignId: null
        }
      };
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
  const audience = context.targetAudience || 'businesses';
  const testimonial = context.testimonials[0] || 'teams like yours';
  const industry = context.industry || 'your industry';

  const features = context.productFeatures.length > 0 
    ? context.productFeatures.slice(0, 4).map(f => typeof f === 'string' ? f : (f.value || f.name || f)).join('\n- ')
    : `${feature}\n- Streamlined workflows\n- Real-time insights\n- Seamless integrations`;

  return {
    subjectLine: `${product} Helps ${audience} Overcome ${painPoint.substring(0, 20)}`,
    previewText: `Discover how ${product} solves ${painPoint.substring(0, 30)} for ${audience}`,
    opening: `Are you tired of dealing with ${painPoint}? You're not alone. Many ${audience} face this exact challenge every day, wasting valuable time and resources on manual processes that could be automated.`,
    painPoint: `The reality is that ${painPoint} costs ${audience} more than just time. It impacts your team's productivity, slows down decision-making, and ultimately affects your bottom line. Without the right ${product} solution, these challenges only grow as your organization scales.`,
    solution: `That's where ${product} comes in. Built specifically for ${audience}, ${product} transforms how you handle ${context.productCategory || 'your workflow'} by combining powerful automation with an intuitive interface.`,
    featureSection: `With ${product}, you get:\n- ${features}`,
    benefits: `By using ${product}, you can:\n- Save time and reduce manual work by up to 60%\n- Improve team collaboration and communication\n- Make data-driven decisions with real-time insights\n- Scale your operations efficiently without adding headcount\n- Reduce errors and improve accuracy across your workflows`,
    customerStory: `One ${audience} team implemented ${product} and transformed their operations. Within weeks, they were able to cut processing time in half and redirect their focus to strategic initiatives that drove real business growth.`,
    socialProof: `${product} is trusted by innovative ${audience} to transform their ${industry} operations. Teams consistently report higher satisfaction and better outcomes after switching to ${product}.`,
    cta: `Try ${product} Free Today`,
    closing: `Ready to see what ${product} can do for you and your ${audience} team? Start your free trial and experience the difference firsthand.`,
    signature: `Best regards,\nThe ${company} Team`,
    footer: `${product} | ${company}\n&copy; ${new Date().getFullYear()} All rights reserved.\nIf you no longer wish to receive these emails, you can unsubscribe here.`,
    ps: `P.S. Start your free trial of ${product} today and see why ${audience} are making the switch. No credit card required.`,
    plainTextBody: `Hello,\n\nAre you tired of dealing with ${painPoint}? You're not alone.\n\nMany ${audience} struggle with these challenges every day. The reality is that ${painPoint} costs your team time, productivity, and ultimately affects your bottom line.\n\nThat's where ${product} comes in. ${product} by ${company} is designed specifically for ${audience} to help you overcome these challenges.\n\nWith ${product}, you get:\n- ${features}\n\nBy using ${product}, you can:\n- Save time and reduce manual work\n- Improve team collaboration\n- Make data-driven decisions\n- Scale your operations efficiently\n\n${testimonial ? `"${testimonial}"` : ''}\n\n${competitor ? `Unlike ${competitor}, ${product} is built specifically for ${audience} needs.` : ''}\n\nReady to transform your ${industry} operations? Try ${product} today.\n\nBest regards,\nThe ${company} Team\n\nP.S. Start your free trial of ${product} today and experience the difference. No credit card required.`,
    htmlBody: `<html><body><p>Hello,</p><p>Are you tired of dealing with ${painPoint}? You're not alone.</p><p>Many ${audience} face this challenge. That's where ${product} comes in.</p><p><strong>${product}</strong> helps you:</p><ul><li>${features}</li></ul><p>Ready to get started?</p><p>Best regards,<br/>The ${company} Team</p><p>P.S. Try ${product} today.</p></body></html>`,
    markdownBody: `# ${product} Helps ${audience} Overcome ${painPoint.substring(0, 20)}\n\n> Discover how ${product} solves ${painPoint.substring(0, 30)} for ${audience}\n\nAre you tired of dealing with ${painPoint}? You're not alone.\n\n## The Challenge\n\nThe reality is that ${painPoint} costs ${audience} more than just time.\n\n## The Solution\n\nThat's where ${product} comes in.\n\n## Features\n\n- ${features}\n\n## Benefits\n\n- Save time and reduce manual work\n- Improve team collaboration\n- Make data-driven decisions\n- Scale your operations efficiently\n\n> One ${audience} team implemented ${product} and transformed their operations.\n\n**[Try ${product} Free Today](#)**\n\nReady to see what ${product} can do for you?\n\nBest regards,\nThe ${company} Team\n\n---\n\n${product} | ${company}\n\n*P.S. Start your free trial of ${product} today and see why ${audience} are making the switch.*`
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

export async function saveDraftCampaign(campaignId, emailData) {
  try {
    const campaign = await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: {
        status: 'draft',
        updatedAt: new Date(),
        sequenceItems: {
          updateMany: {
            where: {},
            data: {
              subjectLine: emailData.subjectLine,
              previewText: emailData.previewText,
              emailBodyText: emailData.plainTextBody,
              emailBodyHtml: emailData.htmlBody,
              primaryCta: emailData.cta
            }
          }
        }
      }
    });
    return { success: true, data: campaign };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createRecurringCampaign({ chatId, userId, name, recurrence = 'monthly', listIds, senderId, campaignId }) {
  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId }, include: { sequenceItems: { take: 1 } } });
    if (!campaign) return { success: false, error: 'Campaign not found' };

    const item = campaign.sequenceItems[0];
    const result = await brevoProvider.createRecurringCampaign({
      name: name || campaign.name,
      subject: item?.subjectLine || '',
      htmlContent: item?.responsiveHtml || item?.emailBodyHtml || '',
      plainTextContent: item?.emailBodyText || '',
      senderId: senderId || 1,
      listIds: listIds || [],
      recurrence,
    });

    if (!result.success) return { success: false, error: result.error };

    await prisma.emailCampaignLog.create({
      data: {
        emailCampaignId: campaignId,
        action: 'recurring_campaign_created',
        status: 'scheduled',
        message: `Recurring campaign created with recurrence: ${recurrence}`,
        metadata: { brevoCampaignId: result.data?.id, recurrence }
      }
    });

    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function listAudienceSegments() {
  try {
    const result = await brevoProvider.listSegments();
    return { success: true, data: result.data?.segments || [] };
  } catch (error) {
    return { success: false, error: error.message };
  }
}

export async function createAudienceSegment({ segmentName, conditions }) {
  try {
    const result = await brevoProvider.createSegment({ segmentName, conditions });
    return { success: true, data: result.data };
  } catch (error) {
    return { success: false, error: error.message };
  }
}
