import {
  createCompany,
  updateCompany,
  archiveCompany,
  getCompany,
  listCompanies,
} from "../../../services/automation/crm-entity.service.js";

export async function handleCreateCompany(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const result = await createCompany(chatId, userId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleUpdateCompany(req, res) {
  try {
    const { chatId, companyId } = req.params;
    const result = await updateCompany(chatId, companyId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleArchiveCompany(req, res) {
  try {
    const { chatId, companyId } = req.params;
    const result = await archiveCompany(chatId, companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetCompany(req, res) {
  try {
    const { chatId, companyId } = req.params;
    const result = await getCompany(chatId, companyId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListCompany(req, res) {
  try {
    const { chatId } = req.params;
    const result = await listCompanies(chatId, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
