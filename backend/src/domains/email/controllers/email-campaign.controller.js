import {
  generateEmailCampaign,
  getCampaignWithDetails,
  listCampaigns,
  updateEmailItem,
  regenerateEmailItem,
  submitForReview,
  approveCampaign,
  requestChanges,
  createVersionSnapshot,
  restoreVersion,
  handleProviderHealth,
  sendTestCampaignEmail,
  sendCampaignEmails,
  handleBrevoWebhook,
  getDeliveryLogs,
  fromAssetToEmailCampaign,
} from '../../../services/email/email-campaign-generator.service.js';

export async function handleGenerateEmailCampaign(req, res) {
  const { chatId } = req.params;
  const { campaignPlanId } = req.body;
  const userId = req.user?.id;

  if (!campaignPlanId) {
    return res.status(400).json({ success: false, error: "campaignPlanId is required" });
  }

  const result = await generateEmailCampaign(chatId, userId, campaignPlanId);
  res.json({ success: true, data: result });
}

export async function handleGetEmailCampaign(req, res) {
  const { campaignId } = req.params;
  const campaign = await getCampaignWithDetails(campaignId);
  if (!campaign) {
    return res.status(404).json({ success: false, error: "Email campaign not found" });
  }
  res.json({ success: true, data: campaign });
}

export async function handleListEmailCampaigns(req, res) {
  const { chatId } = req.params;
  const campaigns = await listCampaigns(chatId);
  res.json({ success: true, data: campaigns });
}

export async function handleUpdateEmailItem(req, res) {
  const { campaignId, itemId } = req.params;
  const userId = req.user?.id;
  const updates = req.body;

  const allowedFields = [
    "emailName", "purpose", "funnelStage", "subjectLine",
    "alternativeSubjectLines", "previewText", "greetingStrategy",
    "emailBodyText", "emailBodyHtml", "primaryCta", "secondaryCta",
    "personalizationFields", "evidenceUsed", "inferenceStatus",
    "complianceNotes", "status",
  ];

  const filtered = {};
  for (const key of allowedFields) {
    if (key in updates) filtered[key] = updates[key];
  }

  if (Object.keys(filtered).length === 0) {
    return res.status(400).json({ success: false, error: "No valid fields to update" });
  }

  const item = await updateEmailItem(campaignId, itemId, filtered, userId);
  res.json({ success: true, data: item });
}

export async function handleRegenerateEmailItem(req, res) {
  const { campaignId, itemId } = req.params;
  const { customPrompt } = req.body;

  const item = await regenerateEmailItem(campaignId, itemId, customPrompt);
  res.json({ success: true, data: item });
}

export async function handleSubmitForReview(req, res) {
  const { campaignId } = req.params;
  const userId = req.user?.id;

  const campaign = await submitForReview(campaignId, userId);
  res.json({ success: true, data: campaign });
}

export async function handleApproveCampaign(req, res) {
  const { campaignId } = req.params;
  const userId = req.user?.id;

  const campaign = await approveCampaign(campaignId, userId);
  res.json({ success: true, data: campaign });
}

export async function handleRequestChanges(req, res) {
  const { campaignId } = req.params;
  const userId = req.user?.id;
  const { feedback } = req.body;

  const campaign = await requestChanges(campaignId, userId, feedback);
  res.json({ success: true, data: campaign });
}

export async function handleCreateVersion(req, res) {
  const { campaignId } = req.params;
  const userId = req.user?.id;
  const { reason } = req.body;

  const version = await createVersionSnapshot(campaignId, reason || "Manual version save", userId);
  res.json({ success: true, data: version });
}

export async function handleRestoreVersion(req, res) {
  const { campaignId, versionId } = req.params;
  const userId = req.user?.id;

  const result = await restoreVersion(campaignId, versionId, userId);
  res.json({ success: true, data: result });
}

export async function handleProviderHealthCheck(req, res) {
  const health = await handleProviderHealth();
  res.json({ success: true, data: health });
}

export async function handleSendTestCampaignEmail(req, res) {
  const { campaignId } = req.params;
  const { recipientEmail, itemId } = req.body;

  if (!recipientEmail) {
    return res.status(400).json({ success: false, error: "recipientEmail is required" });
  }

  const result = await sendTestCampaignEmail(campaignId, recipientEmail, itemId);
  res.json({ success: result.success, data: result });
}

export async function handleSendCampaign(req, res) {
  const { campaignId } = req.params;

  const result = await sendCampaignEmails(campaignId);
  res.json({ success: result.success, data: result });
}

export async function handleGetDeliveryLogs(req, res) {
  const { campaignId } = req.params;

  const logs = await getDeliveryLogs(campaignId);
  res.json({ success: true, data: logs });
}

export async function handleBrevoWebhookEndpoint(req, res) {
  const result = await handleBrevoWebhook(req.body);
  res.status(result.success ? 200 : 400).json(result);
}

export async function handleFromAsset(req, res) {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const { automationAssetId, campaignPlanId, sequenceOrder, purpose, delayAfterPreviousDays } = req.body;

  if (!automationAssetId) {
    return res.status(400).json({ success: false, error: "automationAssetId is required" });
  }

  const result = await fromAssetToEmailCampaign({
    chatId,
    userId,
    automationAssetId,
    campaignPlanId: campaignPlanId || null,
    sequenceOrder: sequenceOrder || 1,
    purpose: purpose || null,
    delayAfterPreviousDays: delayAfterPreviousDays ?? 0,
  });

  if (!result.success) {
    return res.status(422).json(result);
  }

  res.json(result);
}
