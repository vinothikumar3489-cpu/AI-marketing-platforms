import {
  uploadAndParse,
  mapColumns,
  validateRows,
  confirmImport,
  getImportJob,
  listImportJobs,
} from "../services/automation/crm-import.service.js";

export async function handleUploadCsv(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const { csvText, fileContent } = req.body;

    let content = csvText;
    if (!content && fileContent) {
      content = Buffer.from(fileContent, "base64").toString("utf-8");
    }

    if (!content) {
      return res.status(400).json({ success: false, error: "csvText or fileContent (base64) is required" });
    }

    const result = await uploadAndParse(chatId, userId, content);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleMapColumns(req, res) {
  try {
    const { chatId, importId } = req.params;
    const userId = req.user?.id;
    const { columnMapping, importType } = req.body;

    if (!columnMapping || !importType) {
      return res.status(400).json({ success: false, error: "columnMapping and importType are required" });
    }

    const result = await mapColumns(chatId, importId, userId, columnMapping, importType);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleValidateRows(req, res) {
  try {
    const { chatId, importId } = req.params;
    const userId = req.user?.id;

    const result = await validateRows(chatId, importId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleConfirmImport(req, res) {
  try {
    const { chatId, importId } = req.params;
    const userId = req.user?.id;

    const result = await confirmImport(chatId, importId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetImportJob(req, res) {
  try {
    const { chatId, importId } = req.params;

    const result = await getImportJob(chatId, importId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Import job not found" });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListImportJobs(req, res) {
  try {
    const { chatId } = req.params;
    const query = req.query;

    const result = await listImportJobs(chatId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
