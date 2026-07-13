import {
  createContact,
  updateContact,
  archiveContact,
  getContact,
  listContacts,
} from "../services/automation/crm-entity.service.js";

export async function handleCreateContact(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const result = await createContact(chatId, userId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleUpdateContact(req, res) {
  try {
    const { chatId, contactId } = req.params;
    const result = await updateContact(chatId, contactId, req.body);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleArchiveContact(req, res) {
  try {
    const { chatId, contactId } = req.params;
    const result = await archiveContact(chatId, contactId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetContact(req, res) {
  try {
    const { chatId, contactId } = req.params;
    const result = await getContact(chatId, contactId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListContacts(req, res) {
  try {
    const { chatId } = req.params;
    const result = await listContacts(chatId, req.query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
