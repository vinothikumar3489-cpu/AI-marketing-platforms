import {
  createActivity,
  listActivities,
  getRecentActivities,
} from "../services/automation/crm-task-activity.service.js";

export async function handleCreateActivity(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const data = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, error: "chatId is required" });
    }

    const result = await createActivity(chatId, userId, data);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListActivities(req, res) {
  try {
    const { chatId } = req.params;
    const query = req.query;

    const result = await listActivities(chatId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetRecentActivities(req, res) {
  try {
    const { chatId } = req.params;
    const limit = parseInt(req.query.limit, 10) || 10;

    const result = await getRecentActivities(chatId, limit);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
