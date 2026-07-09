import { callAI } from "../../ai/services/aiRouter.service.js";

const CAMPAIGN_TYPES = {
  lead_outreach: { label: 'Lead Outreach' },
  follow_up_sequence: { label: 'Follow-up Sequence' },
  demo_request: { label: 'Demo Request' },
  sales_email: { label: 'Sales Email' },
  investor_outreach: { label: 'Investor Outreach' },
  customer_onboarding: { label: 'Customer Onboarding' },
  customer_retention: { label: 'Customer Retention' },
  re_engagement: { label: 'Re-engagement' },
  referral_campaign: { label: 'Referral Campaign' },
  newsletter: { label: 'Newsletter' },
};

export { CAMPAIGN_TYPES };

export async function generateEmailCampaign(campaignType, context) {
  const typeConfig = CAMPAIGN_TYPES[campaignType];
  if (!typeConfig) throw new Error(`Unknown campaign type: ${campaignType}`);

  const { productName, companyName, targetAudience, industry, senderName } = context;

  const prompt = `Generate a ${typeConfig.label} email draft for marketing execution. Use ONLY the verified data below.

CONTEXT:
Product/Company: ${productName || 'N/A'}${companyName ? `\nCompany: ${companyName}` : ''}${targetAudience ? `\nTarget Audience: ${targetAudience}` : ''}${industry ? `\nIndustry: ${industry}` : ''}${senderName ? `\nSender: ${senderName}` : ''}

CAMPAIGN TYPE: ${typeConfig.label}

REQUIRED OUTPUT FIELDS (return valid JSON):
{
  "subject": "Email subject line (max 60 chars, engaging)",
  "previewText": "Preview text (max 100 chars)",
  "body": "Full email body with personalization variables like {{firstName}}, {{companyName}}",
  "cta": "Clear call to action",
  "personalizationVariables": ["list of variables used"],
  "spamScore": "Likely spam score estimation: Low / Medium / High",
  "readingTime": "Estimated reading time in minutes",
  "complianceChecklist": {
    "unsubscribeLink": true/false,
    "physicalAddress": true/false,
    "gdprCompliant": true/false,
    "canSpamCompliant": true/false,
    "caslCompliant": true/false
  },
  "approvalStatus": "draft",
  "evidence": { "source": "email_campaign_studio", "confidence": null, "dataSource": "ai_generation" }
}

RULES:
1. Use {{firstName}} and {{companyName}} for personalization.
2. Keep subject under 60 characters.
3. Body must be professional, direct, and value-focused.
4. Include unsubscribe reminder at the bottom.
5. Do NOT invent fake credentials, case studies, or statistics.
6. Score spam check realistically (Low is best).
7. Return ONLY valid JSON. No markdown code fences.`;

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      return {
        ...result.data,
        _type: campaignType,
        _label: typeConfig.label,
        _generatedAt: new Date().toISOString(),
        _provider: result.provider || 'ai',
        campaignType,
      };
    }
  } catch (e) {
    console.warn(`[EmailCampaign] AI generation failed for ${campaignType}:`, e.message);
  }

  return null;
}

export async function generateEmailCampaignPlan(context) {
  const types = Object.keys(CAMPAIGN_TYPES);
  const results = {};
  for (const type of types) {
    const email = await generateEmailCampaign(type, context);
    if (email) results[type] = email;
  }
  return {
    campaigns: results,
    totalGenerated: Object.keys(results).length,
    _metadata: {
      evidenceVersion: '2.0.0',
      generatedAt: new Date().toISOString(),
      typesGenerated: Object.keys(results),
      provider: 'email_campaign_studio',
    },
  };
}
