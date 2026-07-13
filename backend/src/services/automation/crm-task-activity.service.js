import { prisma } from "../../config/prisma.js";
import { validateOwnership } from "./crm-data.service.js";

// ─── Tasks ──────────────────────────────────────────────────

export async function createTask(chatId, userId, data) {
  await validateOwnership({ userId, chatId });
  return prisma.cRMTask.create({
    data: { chatId, userId, ...data },
  });
}

export async function updateTask(chatId, taskId, data) {
  const existing = await prisma.cRMTask.findFirst({ where: { id: taskId, chatId } });
  if (!existing) throw new Error("Task not found or access denied");

  const { data: filtered } = Object.fromEntries(
    Object.entries(data).filter(([_, v]) => v !== undefined)
  );

  return prisma.cRMTask.update({
    where: { id: taskId },
    data: filtered,
  });
}

export async function completeTask(chatId, taskId, userId) {
  await validateOwnership({ userId, chatId });
  const task = await prisma.cRMTask.findFirst({ where: { id: taskId, chatId } });
  if (!task) throw new Error("Task not found or access denied");

  const updated = await prisma.cRMTask.update({
    where: { id: taskId },
    data: { status: "COMPLETED", completedAt: new Date() },
  });

  await prisma.cRMActivity.create({
    data: {
      chatId,
      userId,
      contactId: task.contactId,
      companyId: task.companyId,
      dealId: task.dealId,
      activityType: "task_completion",
      title: `Task completed: ${task.title}`,
      description: `Task "${task.title}" was marked as completed`,
      source: "SYSTEM",
    },
  });

  return updated;
}

export async function cancelTask(chatId, taskId) {
  const existing = await prisma.cRMTask.findFirst({ where: { id: taskId, chatId } });
  if (!existing) throw new Error("Task not found or access denied");
  return prisma.cRMTask.update({
    where: { id: taskId },
    data: { status: "CANCELLED" },
  });
}

export async function assignTask(chatId, taskId, assignedTo) {
  const existing = await prisma.cRMTask.findFirst({ where: { id: taskId, chatId } });
  if (!existing) throw new Error("Task not found or access denied");
  return prisma.cRMTask.update({
    where: { id: taskId },
    data: { assignedTo },
  });
}

export async function listTasks(chatId, filters = {}) {
  const page = Math.max(1, parseInt(filters.page) || 1);
  const limit = Math.min(100, Math.max(1, parseInt(filters.limit) || 50));
  const skip = (page - 1) * limit;

  const where = { chatId };
  if (filters.status) where.status = filters.status;
  if (filters.priority) where.priority = filters.priority;
  if (filters.assignedTo) where.assignedTo = filters.assignedTo;
  if (filters.dueAtFrom || filters.dueAtTo) {
    where.dueAt = {};
    if (filters.dueAtFrom) where.dueAt.gte = new Date(filters.dueAtFrom);
    if (filters.dueAtTo) where.dueAt.lte = new Date(filters.dueAtTo);
  }

  const [data, total] = await Promise.all([
    prisma.cRMTask.findMany({ where, skip, take: limit, orderBy: { dueAt: "asc" } }),
    prisma.cRMTask.count({ where }),
  ]);

  return { data, total, page, limit };
}

// ─── Activities ─────────────────────────────────────────────

const MANUAL_TYPES = new Set(["note", "call", "meeting", "email", "manually_recorded"]);
const SYSTEM_TYPES = new Set(["stage_change", "task_completion", "campaign_association", "workflow_execution"]);

export async function createActivity(chatId, userId, data) {
  await validateOwnership({ userId, chatId });

  let source = data.source;
  if (!source) {
    if (MANUAL_TYPES.has(data.activityType)) source = "MANUALLY_RECORDED";
    else if (SYSTEM_TYPES.has(data.activityType)) source = "SYSTEM";
    else if (data.provider && data.providerMessageId) source = "PROVIDER_DELIVERED";
    else source = "MANUALLY_RECORDED";
  }

  return prisma.cRMActivity.create({
    data: {
      chatId,
      userId,
      ...data,
      source,
    },
  });
}

export async function listActivities(chatId, filters = {}) {
  const where = { chatId };
  if (filters.contactId) where.contactId = filters.contactId;
  if (filters.companyId) where.companyId = filters.companyId;
  if (filters.dealId) where.dealId = filters.dealId;
  if (filters.activityType) where.activityType = filters.activityType;

  return prisma.cRMActivity.findMany({
    where,
    orderBy: { activityDate: "desc" },
    take: 100,
  });
}

export async function getRecentActivities(chatId) {
  return prisma.cRMActivity.findMany({
    where: { chatId },
    orderBy: { activityDate: "desc" },
    take: 20,
  });
}
