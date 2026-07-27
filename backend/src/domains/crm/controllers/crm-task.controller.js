import {
  createTask,
  updateTask,
  completeTask,
  cancelTask,
  assignTask,
  listTasks,
} from "../../../services/automation/crm-task-activity.service.js";

export async function handleCreateTask(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const data = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, error: "chatId is required" });
    }

    const result = await createTask(chatId, userId, data);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleUpdateTask(req, res) {
  try {
    const { chatId, taskId } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    const result = await updateTask(chatId, taskId, userId, updates);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleCompleteTask(req, res) {
  try {
    const { chatId, taskId } = req.params;
    const userId = req.user?.id;

    const result = await completeTask(chatId, taskId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleCancelTask(req, res) {
  try {
    const { chatId, taskId } = req.params;
    const userId = req.user?.id;

    const result = await cancelTask(chatId, taskId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleAssignTask(req, res) {
  try {
    const { chatId, taskId } = req.params;
    const userId = req.user?.id;
    const { assigneeId } = req.body;

    if (!assigneeId) {
      return res.status(400).json({ success: false, error: "assigneeId is required" });
    }

    const result = await assignTask(chatId, taskId, userId, assigneeId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListTasks(req, res) {
  try {
    const { chatId } = req.params;
    const query = req.query;

    const result = await listTasks(chatId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
