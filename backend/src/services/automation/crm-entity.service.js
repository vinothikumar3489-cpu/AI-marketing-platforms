import prisma from "../../config/prisma.js";
import {
  validateOwnership,
  normalizeEmail,
  normalizePhone,
  loadContactById,
  loadCompanyById,
  loadDealById,
} from "./crm-data.service.js";
import { getDefaultPipeline } from "./crm-pipeline.service.js";

// ─── Contacts ───────────────────────────────────────────────

export async function createContact(chatId, userId, data) {
  await validateOwnership({ userId, chatId });
  const email = normalizeEmail(data.email);
  const phone = normalizePhone(data.phone);
  return prisma.cRMContact.create({
    data: {
      chatId,
      userId,
      ...data,
      ...(email !== null && { email }),
      ...(phone !== null && { phone }),
    },
  });
}

export async function updateContact(chatId, contactId, data) {
  const existing = await loadContactById(chatId, contactId);
  if (!existing) throw new Error("Contact not found or access denied");

  const filtered = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );
  if (filtered.email !== undefined) filtered.email = normalizeEmail(filtered.email) ?? filtered.email;
  if (filtered.phone !== undefined) filtered.phone = normalizePhone(filtered.phone) ?? filtered.phone;

  return prisma.cRMContact.update({
    where: { id: contactId },
    data: filtered,
  });
}

export async function archiveContact(chatId, contactId) {
  const existing = await loadContactById(chatId, contactId);
  if (!existing) throw new Error("Contact not found or access denied");
  return prisma.cRMContact.update({
    where: { id: contactId },
    data: { archivedAt: new Date() },
  });
}

export async function getContact(chatId, contactId) {
  const contact = await prisma.cRMContact.findFirst({
    where: { id: contactId, chatId },
    include: {
      company: true,
      deals: true,
      tasks: true,
      activities: { orderBy: { activityDate: "desc" }, take: 20 },
    },
  });
  if (!contact) throw new Error("Contact not found");
  return contact;
}

export async function listContacts(chatId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
  const skip = (page - 1) * limit;

  const where = { chatId, archivedAt: null };
  if (filters.search) {
    where.OR = [
      { firstName: { contains: filters.search, mode: "insensitive" } },
      { lastName: { contains: filters.search, mode: "insensitive" } },
      { email: { contains: filters.search, mode: "insensitive" } },
    ];
  }
  if (filters.lifecycleStage) where.lifecycleStage = filters.lifecycleStage;
  if (filters.status) where.status = filters.status;

  const [data, total] = await Promise.all([
    prisma.cRMContact.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.cRMContact.count({ where }),
  ]);

  return { data, total, page, limit };
}

// ─── Companies ──────────────────────────────────────────────

export async function createCompany(chatId, userId, data) {
  await validateOwnership({ userId, chatId });
  return prisma.cRMCompany.create({
    data: { chatId, userId, ...data },
  });
}

export async function updateCompany(chatId, companyId, data) {
  const existing = await loadCompanyById(chatId, companyId);
  if (!existing) throw new Error("Company not found or access denied");

  const filtered = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  return prisma.cRMCompany.update({
    where: { id: companyId },
    data: filtered,
  });
}

export async function archiveCompany(chatId, companyId) {
  const existing = await loadCompanyById(chatId, companyId);
  if (!existing) throw new Error("Company not found or access denied");
  return prisma.cRMCompany.update({
    where: { id: companyId },
    data: { archivedAt: new Date() },
  });
}

export async function getCompany(chatId, companyId) {
  const company = await prisma.cRMCompany.findFirst({
    where: { id: companyId, chatId },
    include: {
      contacts: true,
      deals: true,
      activities: { orderBy: { activityDate: "desc" }, take: 20 },
    },
  });
  if (!company) throw new Error("Company not found");
  return company;
}

export async function listCompanies(chatId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
  const skip = (page - 1) * limit;

  const where = { chatId, archivedAt: null };
  if (filters.search) {
    where.OR = [
      { name: { contains: filters.search, mode: "insensitive" } },
      { industry: { contains: filters.search, mode: "insensitive" } },
    ];
  }

  const [data, total] = await Promise.all([
    prisma.cRMCompany.findMany({ where, skip, take: limit, orderBy: { createdAt: "desc" } }),
    prisma.cRMCompany.count({ where }),
  ]);

  return { data, total, page, limit };
}

// ─── Deals ──────────────────────────────────────────────────

export async function createDeal(chatId, userId, data) {
  await validateOwnership({ userId, chatId });

  let stageId = data.stageId;
  let pipelineId = data.pipelineId;

  if (!stageId) {
    const pipeline = await getDefaultPipeline(chatId);
    if (pipeline && pipeline.stages.length > 0) {
      pipelineId = pipeline.id;
      stageId = pipeline.stages[0].id;
    }
  } else if (!pipelineId) {
    const stage = await prisma.cRMPipelineStage.findUnique({ where: { id: stageId } });
    if (stage) pipelineId = stage.pipelineId;
  }

  const { stageId: _s, pipelineId: _p, ...rest } = data;

  return prisma.cRMDeal.create({
    data: {
      chatId,
      userId,
      ...rest,
      stageId: stageId ?? undefined,
      pipelineId: pipelineId ?? undefined,
    },
    include: { stage: true, pipeline: true, contact: true, company: true },
  });
}

export async function updateDeal(chatId, dealId, data) {
  const existing = await loadDealById(chatId, dealId);
  if (!existing) throw new Error("Deal not found or access denied");

  const filtered = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  return prisma.cRMDeal.update({
    where: { id: dealId },
    data: filtered,
    include: { stage: true, pipeline: true, contact: true, company: true },
  });
}

export async function archiveDeal(chatId, dealId) {
  const existing = await loadDealById(chatId, dealId);
  if (!existing) throw new Error("Deal not found or access denied");
  return prisma.cRMDeal.update({
    where: { id: dealId },
    data: { archivedAt: new Date() },
  });
}

export async function getDeal(chatId, dealId) {
  const deal = await prisma.cRMDeal.findFirst({
    where: { id: dealId, chatId },
    include: {
      stage: true,
      pipeline: true,
      contact: true,
      company: true,
      tasks: true,
      activities: { orderBy: { activityDate: "desc" } },
    },
  });
  if (!deal) throw new Error("Deal not found");
  return deal;
}

export async function listDeals(chatId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
  const skip = (page - 1) * limit;

  const where = { chatId, archivedAt: null };
  if (filters.pipelineId) where.pipelineId = filters.pipelineId;
  if (filters.stageId) where.stageId = filters.stageId;
  if (filters.status) where.status = filters.status;

  const [data, total] = await Promise.all([
    prisma.cRMDeal.findMany({
      where,
      skip,
      take: limit,
      orderBy: { updatedAt: "desc" },
      include: { stage: true, pipeline: true, contact: true, company: true },
    }),
    prisma.cRMDeal.count({ where }),
  ]);

  return { data, total, page, limit };
}
