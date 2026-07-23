import { callAI } from "../../domains/ai/services/aiOrchestrator.service.js";
import { sendTestEmail } from "../providers/email/email-service-legacy.js";
import { getEmailProviderHealth } from "../providers/email/email-provider-registry.js";

// Email campaign types with purpose and audience metadata
const CAMPAIGN_TYPES = {
  lead_outreach: {
    label: 'Lead Outreach',
    purpose: 'Initial contact with qualified leads to introduce product and start conversation',
    defaultPersona: 'decision_maker',
  },
  follow_up_sequence: {
    label: 'Follow-up Sequence',
    purpose: 'Re-engage leads that did not respond to initial outreach',
    defaultPersona: 'existing_lead',
  },
  demo_request: {
    label: 'Demo Invitation',
    purpose: 'Invite qualified prospects to schedule a product demonstration',
    defaultPersona: 'qualified_prospect',
  },
  customer_onboarding: {
    label: 'Customer Onboarding',
    purpose: 'Guide new customers through initial setup and activation',
    defaultPersona: 'new_customer',
  },
  re_engagement: {
    label: 'Re-engagement',
    purpose: 'Win back dormant leads or inactive customers',
    defaultPersona: 'dormant_contact',
  },
  newsletter: {
    label: 'Newsletter',
    purpose: 'Regular updates and value delivery to subscribers',
    defaultPersona: 'subscriber',
  },
  customer_retention: {
    label: 'Customer Retention',
    purpose: 'Strengthen relationship with existing customers and reduce churn',
    defaultPersona: 'existing_customer',
  },
};

export { CAMPAIGN_TYPES };

// PART 10: Brevo campaign statuses for Content Studio workflow
export const BREVO_CAMPAIGN_STATUSES = {
  draft: 'draft',
  scheduled: 'scheduled',
  sending: 'sending',
  sent: 'sent',
  paused: 'paused',
  finished: 'finished',
  failed: 'failed',
};

// PART 10: Required validations for Brevo campaign creation
export function validateBrevoCampaignData(campaignData) {
  const errors = [];
  
  if (!campaignData.name || typeof campaignData.name !== 'string') {
    errors.push('Campaign name is required');
  }
  
  if (!campaignData.subject || typeof campaignData.subject !== 'string') {
    errors.push('Email subject is required');
  }
  
  if (!campaignData.sender || !campaignData.sender.email) {
    errors.push('Valid sender email is required');
  }
  
  if (!campaignData.recipients || !Array.isArray(campaignData.recipients) || campaignData.recipients.length === 0) {
    errors.push('At least one recipient is required');
  }
  
  if (!campaignData.htmlContent && !campaignData.textContent) {
    errors.push('Either HTML or text content is required');
  }
  
  return {
    valid: errors.length === 0,
    errors
  };
}

// PART 10: Convert email_copy DTO to Brevo campaign format
export function emailCopyToBrevoCampaign(emailCopy, campaignName) {
  return {
    name: campaignName || emailCopy.subject || 'Email Campaign',
    subject: emailCopy.subject,
    htmlContent: emailCopy.html,
    textContent: emailCopy.plainText,
    sender: {
      name: emailCopy.signature?.split(' - ')[0] || emailCopy.productIdentity?.brandName || 'Team',
      email: process.env.BREVO_FROM_EMAIL || 'noreply@example.com'
    },
    recipients: {
      listIds: [] // To be populated by caller
    },
    type: 'classic',
    status: BREVO_CAMPAIGN_STATUSES.draft,
    tags: ['content-studio', emailCopy.emailType || 'promotional']
  };
}

// ============================================
// 1. CONTENT GENERATION (separate from delivery)
// ============================================

export async function generateEmailContent(campaignType, context) {
  const typeConfig = CAMPAIGN_TYPES[campaignType];
  if (!typeConfig) throw new Error(`Unknown campaign type: ${campaignType}`);

  const { productName, companyName, targetAudience, industry, senderName, productUsp, evidence } = context;

  const evidenceLines = [];
  if (productUsp) evidenceLines.push(`Product USP: ${productUsp}`);
  if (evidence?.website?.ctaTexts?.value?.length) evidenceLines.push(`Actual Website CTAs: ${evidence.website.ctaTexts.value.join('; ')}`);
  if (evidence?.website?.heroText?.value) evidenceLines.push(`Website Hero Text: ${evidence.website.heroText.value}`);
  if (evidence?.audience?.painPoints?.value?.length) evidenceLines.push(`Audience Pain Points: ${evidence.audience.painPoints.value.slice(0, 3).join('; ')}`);
  if (evidence?.competitors?.list?.value?.length) evidenceLines.push(`Competitors: ${evidence.competitors.list.value.slice(0, 3).map(c => c.name || c.url).filter(Boolean).join(', ')}`);
  if (evidence?.sourceSummary?.sourcesCollected?.length) evidenceLines.push(`Evidence Sources: ${evidence.sourceSummary.sourcesCollected.join(', ')}`);

  const prompt = `Generate a ${typeConfig.label} email for marketing automation. Use ONLY the verified data below.

CAMPAIGN PURPOSE: ${typeConfig.purpose}
TARGET PERSONA: ${typeConfig.defaultPersona}

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${senderName ? `\nSender: ${senderName}` : ''}
${evidenceLines.join('\n')}

REQUIRED OUTPUT (valid JSON):
{
  "subject": "Email subject line (max 60 chars, specific to product)",
  "previewText": "Preview text (max 100 chars)",
  "body": "Full email body with evidence-backed pain point, product value, and one CTA",
  "cta": "Single clear call to action",
  "personalizationVariables": ["{{firstName}}", "{{companyName}}"],
  "readingTime": "1 min",
  "sourceLimitations": "Generated from verified evidence. No external data sources connected."
}

RULES:
1. Use {{firstName}} and {{companyName}} for personalization only.
2. Subject specific to product — no generic phrases.
3. Body must include product value and evidence-backed pain point.
4. Exactly one CTA.
5. Do NOT invent fake statistics, case studies, or testimonials.
6. Return ONLY valid JSON. No markdown.`;
 
  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        campaignType,
        campaignPurpose: typeConfig.purpose,
        targetPersona: typeConfig.defaultPersona,
        _type: campaignType,
        _label: typeConfig.label,
        _generatedAt: new Date().toISOString(),
        _contentProvider: result.provider || 'ai',
        _status: 'content_generated',
      };
    }
  } catch (e) {
    console.warn(`[EmailCampaign] Content generation failed for ${campaignType}:`, e.message);
  }

  return {
    campaignType,
    campaignPurpose: typeConfig.purpose,
    targetPersona: typeConfig.defaultPersona,
    _type: campaignType,
    _label: typeConfig.label,
    _generatedAt: new Date().toISOString(),
    _status: 'content_generation_failed',
    _error: 'AI content generation returned no result',
  };
}

// ============================================
// 2. PROVIDER DELIVERY (via registry)
// ============================================

export async function deliverEmail(emailData, recipient) {
  const result = {
    status: 'pending',
    provider: null,
    providerResponseId: null,
    error: null,
    attemptedProviders: [],
  };

  const health = getEmailProviderHealth();
  if (!health.canSend) {
    result.status = 'failed';
    result.error = 'No email provider configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL.';
    return result;
  }

  result.attemptedProviders.push(health.activeProvider);

  try {
    const sendResult = await sendTestEmail({
      recipientEmail: recipient,
      subject: emailData.subject,
      body: emailData.body,
      approvalChecked: true,
    });

    if (sendResult.success) {
      result.status = 'sent';
      result.provider = sendResult.provider || health.activeProvider;
      result.providerResponseId = sendResult.messageId || null;
      return result;
    }

    result.error = sendResult.error || `Provider ${health.activeProvider} returned failure`;
  } catch (err) {
    result.error = err.message || `Provider threw error`;
  }

  result.status = 'failed';
  return result;
}

// ============================================
// 3. SEND STATUS TRACKING
// ============================================

export function createSendRecord(emailContent, deliveryResult, recipient) {
  return {
    campaignType: emailContent.campaignType,
    recipient,
    subject: emailContent.subject,
    contentGeneratedAt: emailContent._generatedAt,
    contentStatus: emailContent._status,
    deliveryStatus: deliveryResult.status,
    deliveryProvider: deliveryResult.provider,
    providerResponseId: deliveryResult.providerResponseId,
    attemptedProviders: deliveryResult.attemptedProviders,
    error: deliveryResult.error,
    retryCount: 0,
    maxRetries: 3,
    sentAt: deliveryResult.status === 'sent' ? new Date().toISOString() : null,
    lastAttemptedAt: new Date().toISOString(),
  };
}

// ============================================
// 4. RETRY / ERROR STATE
// ============================================

export function shouldRetry(sendRecord) {
  if (sendRecord.deliveryStatus === 'sent') return false;
  if (sendRecord.retryCount >= sendRecord.maxRetries) return false;

  const error = sendRecord.error || '';
  // Do not retry auth failures or invalid requests
  if (error.includes('auth') || error.includes('credentials') || error.includes('invalid')) return false;

  return true;
}

export function createRetryRecord(sendRecord, newDeliveryResult) {
  return {
    ...sendRecord,
    deliveryStatus: newDeliveryResult.status,
    deliveryProvider: newDeliveryResult.provider,
    providerResponseId: newDeliveryResult.providerResponseId,
    error: newDeliveryResult.error,
    retryCount: sendRecord.retryCount + 1,
    lastAttemptedAt: new Date().toISOString(),
    sentAt: newDeliveryResult.status === 'sent' ? new Date().toISOString() : sendRecord.sentAt,
  };
}

// ============================================
// BATCH: Generate + track all campaign types
// ============================================

export async function generateEmailCampaignPlan(context) {
  const types = Object.keys(CAMPAIGN_TYPES);
  const results = {};

  for (const type of types) {
    const content = await generateEmailContent(type, context);
    results[type] = {
      content,
      sendRecord: null,
      deliveryStatus: 'not_attempted',
    };
  }

  return {
    campaigns: results,
    totalGenerated: Object.keys(results).length,
    providerConfigured: !!(process.env.GMAIL_USER || process.env.SENDGRID_API_KEY || process.env.BREVO_API_KEY || process.env.RESEND_API_KEY),
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'email_campaign_studio',
    },
  };
}
