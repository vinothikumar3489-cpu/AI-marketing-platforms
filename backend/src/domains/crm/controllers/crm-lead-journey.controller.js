import {
  generateLeadJourney,
  getLeadJourney,
} from "../../../services/automation/lead-journey.service.js";

export async function handleGenerateLeadJourney(req, res) {
  try {
    const { chatId, contactId } = req.params;
    const userId = req.user?.id;

    if (!contactId) {
      return res.status(400).json({ success: false, error: "contactId is required" });
    }

    const result = await generateLeadJourney(chatId, contactId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetLeadJourney(req, res) {
  try {
    const { chatId, contactId } = req.params;

    if (!contactId) {
      return res.status(400).json({ success: false, error: "contactId is required" });
    }

    const result = await getLeadJourney(chatId, contactId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Lead journey not found" });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
