import {
  createPipeline,
  renamePipeline,
  archivePipeline,
  getPipeline,
  listPipelines,
  createStage,
  renameStage,
  reorderStages,
  archiveStage,
  getDefaultPipeline,
} from "../services/automation/crm-pipeline.service.js";

export async function handleCreatePipeline(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { name, description } = req.body;
    const result = await createPipeline(chatId, userId, name, description);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleRenamePipeline(req, res) {
  try {
    const { chatId, pipelineId } = req.params;
    const userId = req.user?.id;
    const { name } = req.body;
    const result = await renamePipeline(chatId, pipelineId, name, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleArchivePipeline(req, res) {
  try {
    const { chatId, pipelineId } = req.params;
    const userId = req.user?.id;
    const result = await archivePipeline(chatId, pipelineId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetPipeline(req, res) {
  try {
    const { chatId, pipelineId } = req.params;
    const userId = req.user?.id;
    const result = await getPipeline(chatId, pipelineId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListPipelines(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const result = await listPipelines(chatId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleCreateStage(req, res) {
  try {
    const { pipelineId } = req.params;
    const { name, stageType } = req.body;
    const result = await createStage(pipelineId, name, stageType);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleRenameStage(req, res) {
  try {
    const { chatId, stageId } = req.params;
    const userId = req.user?.id;
    const { name } = req.body;
    const result = await renameStage(chatId, stageId, name, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleReorderStages(req, res) {
  try {
    const { chatId, pipelineId } = req.params;
    const userId = req.user?.id;
    const { stageIds } = req.body;
    const result = await reorderStages(chatId, pipelineId, stageIds, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleArchiveStage(req, res) {
  try {
    const { chatId, stageId } = req.params;
    const userId = req.user?.id;
    const result = await archiveStage(chatId, stageId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetDefaultPipeline(req, res) {
  try {
    const { chatId } = req.params;
    const result = await getDefaultPipeline(chatId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
