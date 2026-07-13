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
} from "../services/automation/email-campaign.service.js";

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
