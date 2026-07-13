import {
  createDeal,
  updateDeal,
  archiveDeal,
  getDeal,
  listDeals,
} from "../services/automation/crm-entity.service.js";
import { moveDealStage } from "../services/automation/crm-pipeline.service.js";

export async function handleCreateDeal(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const result = await createDeal(chatId, userId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleUpdateDeal(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const result = await updateDeal(chatId, dealId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleArchiveDeal(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const result = await archiveDeal(chatId, dealId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetDeal(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const result = await getDeal(chatId, dealId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListDeals(req, res) {
  try {
    const { chatId } = req.params;
    const result = await listDeals(chatId, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleMoveDealStage(req, res) {
  try {
    const { chatId, dealId } = req.params;
    const userId = req.user?.id;
    const { stageId } = req.body;
    const result = await moveDealStage(chatId, dealId, stageId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
