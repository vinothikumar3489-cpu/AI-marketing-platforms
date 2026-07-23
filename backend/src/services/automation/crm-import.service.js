import prisma from "../../config/prisma.js";
import { normalizeEmail, normalizePhone } from "./crm-data.service.js";

const VALID_DUPLICATE_STRATEGIES = [
  "SKIP_EXISTING",
  "UPDATE_EMPTY_FIELDS",
  "UPDATE_ALL_MAPPED_FIELDS",
  "CREATE_DUPLICATE",
];

const VALID_IMPORT_TYPES = ["contact", "company"];
const MAX_FIELD_LENGTH = 500;
const FORMULA_INJECTION_PATTERN = /^[=+\-@]/;

function parseCSV(content) {
  const rows = [];
  const lines = content.replace(/\r\n/g, "\n").replace(/\r/g, "\n").split("\n");

  for (const line of lines) {
    if (line.trim() === "") continue;
    const fields = [];
    let current = "";
    let inQuotes = false;

    for (let i = 0; i < line.length; i++) {
      const char = line[i];
      if (char === '"') {
        if (inQuotes && i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = !inQuotes;
        }
      } else if (char === "," && !inQuotes) {
        fields.push(current.trim());
        current = "";
      } else {
        current += char;
      }
    }
    fields.push(current.trim());
    rows.push(fields);
  }

  return rows;
}

function detectColumns(headerRow) {
  return headerRow.map(h => h.trim());
}

function sanitizeValue(value) {
  if (typeof value !== "string") return "";
  const trimmed = value.trim();
  if (FORMULA_INJECTION_PATTERN.test(trimmed)) {
    return trimmed.replace(/^[=+\-@]/, "");
  }
  if (trimmed.length > MAX_FIELD_LENGTH) {
    return trimmed.substring(0, MAX_FIELD_LENGTH);
  }
  return trimmed;
}

function rowsToObjects(columns, dataRows) {
  return dataRows.map(row => {
    const obj = {};
    columns.forEach((col, i) => {
      obj[col] = row[i] || "";
    });
    return obj;
  });
}

export async function uploadAndParse(chatId, userId, fileName, fileBuffer) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) throw new Error("Chat not found or access denied");

  const content = fileBuffer.toString("utf-8");
  const rows = parseCSV(content);

  if (rows.length < 1) {
    throw new Error("CSV file is empty or has no header row");
  }

  const headerRow = rows[0];
  const dataRows = rows.slice(1);
  const columns = detectColumns(headerRow);
  const parsedData = rowsToObjects(columns, dataRows);

  const importJob = await prisma.cRMImportJob.create({
    data: {
      chatId,
      userId,
      fileName,
      fileType: "csv",
      status: "PARSED",
      totalRows: parsedData.length,
      importType: "contact",
      parsedData,
      columnMapping: {},
    },
  });

  return importJob;
}

export async function mapColumns(importId, columnMapping, importType) {
  const job = await prisma.cRMImportJob.findUnique({ where: { id: importId } });
  if (!job) throw new Error("Import job not found");

  if (!VALID_IMPORT_TYPES.includes(importType)) {
    throw new Error(`Invalid import type. Must be one of: ${VALID_IMPORT_TYPES.join(", ")}`);
  }

  const parsedData = job.parsedData || [];
  const mappedData = parsedData.map(row => {
    const mapped = {};
    for (const [sourceCol, targetField] of Object.entries(columnMapping)) {
      if (targetField && row[sourceCol] !== undefined) {
        mapped[targetField] = sanitizeValue(row[sourceCol]);
      }
    }
    return mapped;
  });

  const updated = await prisma.cRMImportJob.update({
    where: { id: importId },
    data: {
      columnMapping,
      mappedData,
      importType,
      status: "MAPPED",
    },
  });

  return updated;
}

export async function validateRows(importId) {
  const job = await prisma.cRMImportJob.findUnique({ where: { id: importId } });
  if (!job) throw new Error("Import job not found");

  const mappedData = job.mappedData || [];
  const validRows = [];
  const invalidRows = [];
  const errors = [];

  const isContact = job.importType === "contact";

  for (let i = 0; i < mappedData.length; i++) {
    const row = mappedData[i];
    const rowErrors = [];
    const rowIndex = i + 1;

    if (isContact) {
      if (!row.firstName || String(row.firstName).trim() === "") {
        rowErrors.push({ row: rowIndex, field: "firstName", message: "First name is required" });
      }

      if (row.email) {
        const normalized = normalizeEmail(row.email);
        if (!normalized) {
          rowErrors.push({ row: rowIndex, field: "email", message: "Invalid email format" });
        } else {
          row.email = normalized;
        }
      }

      if (row.phone) {
        const normalized = normalizePhone(row.phone);
        if (!normalized) {
          rowErrors.push({ row: rowIndex, field: "phone", message: "Invalid phone format" });
        } else {
          row.phone = normalized;
        }
      }
    } else {
      if (!row.name || String(row.name).trim() === "") {
        rowErrors.push({ row: rowIndex, field: "name", message: "Company name is required" });
      }
    }

    if (rowErrors.length > 0) {
      invalidRows.push(row);
      errors.push(...rowErrors);
    } else {
      validRows.push(row);
    }
  }

  await prisma.cRMImportJob.update({
    where: { id: importId },
    data: {
      validRows: validRows.length,
      invalidRows: invalidRows.length,
      validationSummary: errors,
      errorDetails: errors,
      status: "VALIDATED",
    },
  });

  return { validRows, invalidRows, errors };
}

export async function confirmImport(importId) {
  const job = await prisma.cRMImportJob.findUnique({ where: { id: importId } });
  if (!job) throw new Error("Import job not found");

  if (!VALID_DUPLICATE_STRATEGIES.includes(job.duplicateStrategy)) {
    throw new Error(`Invalid duplicate strategy: ${job.duplicateStrategy}`);
  }

  await prisma.cRMImportJob.update({
    where: { id: importId },
    data: { status: "IMPORTING" },
  });

  const mappedData = job.mappedData || [];
  const isContact = job.importType === "contact";
  const strategy = job.duplicateStrategy;

  let imported = 0;
  let duplicates = 0;
  const errors = [];

  for (let i = 0; i < mappedData.length; i++) {
    const row = mappedData[i];
    const rowIndex = i + 1;

    try {
      let existing = null;

      if (isContact) {
        if (row.email) {
          existing = await prisma.cRMContact.findFirst({
            where: { chatId: job.chatId, email: row.email },
          });
        }
      } else {
        if (row.name) {
          existing = await prisma.cRMCompany.findFirst({
            where: { chatId: job.chatId, name: row.name },
          });
        }
      }

      if (existing) {
        duplicates++;

        if (strategy === "SKIP_EXISTING") {
          continue;
        }

        if (strategy === "CREATE_DUPLICATE") {
          await createImportRecord(job, row, isContact);
          imported++;
          continue;
        }

        if (strategy === "UPDATE_EMPTY_FIELDS") {
          const updateData = {};
          for (const [key, value] of Object.entries(row)) {
            if (value && String(value).trim() !== "" && !existing[key]) {
              updateData[key] = value;
            }
          }
          if (Object.keys(updateData).length > 0) {
            await updateImportRecord(existing.id, updateData, isContact);
          }
          imported++;
          continue;
        }

        if (strategy === "UPDATE_ALL_MAPPED_FIELDS") {
          const updateData = {};
          for (const [key, value] of Object.entries(row)) {
            if (value && String(value).trim() !== "") {
              updateData[key] = value;
            }
          }
          if (Object.keys(updateData).length > 0) {
            await updateImportRecord(existing.id, updateData, isContact);
          }
          imported++;
          continue;
        }
      } else {
        await createImportRecord(job, row, isContact);
        imported++;
      }
    } catch (err) {
      errors.push({ row: rowIndex, message: err.message });
    }
  }

  const finalStatus = errors.length > 0 ? "COMPLETED" : "COMPLETED";

  await prisma.cRMImportJob.update({
    where: { id: importId },
    data: {
      status: finalStatus,
      importedRows: imported,
      duplicateRows: duplicates,
      errorRows: errors.length,
      errorDetails: errors,
      completedAt: new Date(),
    },
  });

  return { imported, duplicates, errors };
}

async function createImportRecord(job, row, isContact) {
  if (isContact) {
    return prisma.cRMContact.create({
      data: {
        chatId: job.chatId,
        userId: job.userId,
        firstName: row.firstName || "Unknown",
        lastName: row.lastName || null,
        email: row.email || null,
        phone: row.phone || null,
        jobTitle: row.jobTitle || null,
        lifecycleStage: row.lifecycleStage || "NOT_MEASURED",
        source: row.source || "IMPORT",
        consentStatus: row.consentStatus || "NOT_MEASURED",
        status: "ACTIVE",
      },
    });
  }

  return prisma.cRMCompany.create({
    data: {
      chatId: job.chatId,
      userId: job.userId,
      name: row.name || "Unknown",
      website: row.website || null,
      industry: row.industry || null,
      employeeRange: row.employeeRange || null,
      location: row.location || null,
      description: row.description || null,
      source: row.source || "IMPORT",
    },
  });
}

async function updateImportRecord(recordId, data, isContact) {
  if (isContact) {
    return prisma.cRMContact.update({ where: { id: recordId }, data });
  }
  return prisma.cRMCompany.update({ where: { id: recordId }, data });
}

export async function getImportJob(importId) {
  const job = await prisma.cRMImportJob.findUnique({ where: { id: importId } });
  if (!job) throw new Error("Import job not found");
  return job;
}

export async function listImportJobs(chatId) {
  return prisma.cRMImportJob.findMany({
    where: { chatId },
    orderBy: { createdAt: "desc" },
  });
}
