import {
  getDashboard, getDealInsights, generateFollowUp,
  getNextBestAction, scoreOpportunity, getSalesTimeline,
  getConversationMemory, getMeetingPrep,
  generateProposal, listProposals, getCustomerHealth,
  runAutomation, getCopilotNotifications,
} from "../services/automation/sales-copilot.service.js";

export async function handleGetDashboard(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const data = await getDashboard(chatId, userId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetDealInsights(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const userId = req.user?.id;
    const data = await getDealInsights(chatId, userId, dealId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGenerateFollowUp(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const userId = req.user?.id;
    const { channel } = req.body;
    const data = await generateFollowUp(chatId, userId, dealId, channel || "email");
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetNextBestAction(req, res) {
  try {
    const { chatId, contactId } = req.params;
    const userId = req.user?.id;
    const data = await getNextBestAction(chatId, userId, contactId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleScoreOpportunity(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const userId = req.user?.id;
    const data = await scoreOpportunity(chatId, userId, dealId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetSalesTimeline(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { contactId, dealId, cursor, limit } = req.query;
    const data = await getSalesTimeline(chatId, userId, { contactId, dealId, cursor, limit: parseInt(limit) || 50 });
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetConversationMemory(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { contactId, dealId, interactionType } = req.query;
    const filters = {};
    if (contactId) filters.contactId = contactId;
    if (dealId) filters.dealId = dealId;
    if (interactionType) filters.interactionType = interactionType;
    const data = await getConversationMemory(chatId, userId, filters);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetMeetingPrep(req, res) {
  try {
    const { chatId, contactId } = req.params;
    const userId = req.user?.id;
    const data = await getMeetingPrep(chatId, userId, contactId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGenerateProposal(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const userId = req.user?.id;
    const data = await generateProposal(chatId, userId, dealId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleListProposals(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { dealId } = req.query;
    const data = await listProposals(chatId, userId, dealId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetCustomerHealth(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const data = await getCustomerHealth(chatId, userId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleRunAutomation(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { action, config } = req.body;
    const data = await runAutomation(chatId, userId, action, config);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}

export async function handleGetCopilotNotifications(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const data = await getCopilotNotifications(chatId, userId);
    res.json({ success: true, data });
  } catch (err) { res.status(400).json({ success: false, error: err.message }); }
}
