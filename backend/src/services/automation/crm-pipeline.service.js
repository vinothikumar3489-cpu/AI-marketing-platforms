import prisma from "../../config/prisma.js";
import { validateOwnership } from "./crm-data.service.js";

const DEFAULT_STAGES = [
  { name: "New Lead", stageType: "lead", order: 0, isClosed: false },
  { name: "Qualified", stageType: "qualified", order: 1, isClosed: false },
  { name: "Contacted", stageType: "contacted", order: 2, isClosed: false },
  { name: "Meeting Scheduled", stageType: "meeting", order: 3, isClosed: false },
  { name: "Proposal", stageType: "proposal", order: 4, isClosed: false },
  { name: "Won", stageType: "won", order: 5, isClosed: true },
  { name: "Lost", stageType: "lost", order: 6, isClosed: true },
];

export async function createPipeline(chatId, userId, name, description) {
  await validateOwnership({ userId, chatId });
  return prisma.cRMPipeline.create({
    data: {
      chatId,
      userId,
      name,
      description,
      stages: { create: DEFAULT_STAGES },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}

export async function renamePipeline(chatId, pipelineId, name, userId) {
  await validateOwnership({ userId, chatId });
  const pipeline = await prisma.cRMPipeline.findFirst({
    where: { id: pipelineId, chatId },
  });
  if (!pipeline) throw new Error("Pipeline not found or access denied");
  return prisma.cRMPipeline.update({
    where: { id: pipelineId },
    data: { name },
  });
}

export async function archivePipeline(chatId, pipelineId, userId) {
  await validateOwnership({ userId, chatId });
  const pipeline = await prisma.cRMPipeline.findFirst({
    where: { id: pipelineId, chatId },
  });
  if (!pipeline) throw new Error("Pipeline not found or access denied");
  return prisma.cRMPipeline.update({
    where: { id: pipelineId },
    data: { status: "ARCHIVED" },
  });
}

export async function getPipeline(chatId, pipelineId, userId) {
  await validateOwnership({ userId, chatId });
  const pipeline = await prisma.cRMPipeline.findFirst({
    where: { id: pipelineId, chatId },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (!pipeline) throw new Error("Pipeline not found or access denied");
  return pipeline;
}

export async function listPipelines(chatId, userId) {
  await validateOwnership({ userId, chatId });
  return prisma.cRMPipeline.findMany({
    where: { chatId },
    include: {
      stages: { orderBy: { order: "asc" } },
      _count: { select: { deals: true } },
    },
    orderBy: { createdAt: "asc" },
  });
}

export async function createStage(pipelineId, name, stageType) {
  const maxOrder = await prisma.cRMPipelineStage.aggregate({
    where: { pipelineId },
    _max: { order: true },
  });
  const nextOrder = (maxOrder._max.order ?? -1) + 1;
  return prisma.cRMPipelineStage.create({
    data: { pipelineId, name, stageType, order: nextOrder },
  });
}

export async function renameStage(chatId, stageId, name, userId) {
  await validateOwnership({ userId, chatId });
  const stage = await prisma.cRMPipelineStage.findUnique({
    where: { id: stageId },
    include: { pipeline: true },
  });
  if (!stage || stage.pipeline.chatId !== chatId) {
    throw new Error("Stage not found or access denied");
  }
  return prisma.cRMPipelineStage.update({
    where: { id: stageId },
    data: { name },
  });
}

export async function reorderStages(chatId, pipelineId, stageIds, userId) {
  await validateOwnership({ userId, chatId });
  const pipeline = await prisma.cRMPipeline.findFirst({
    where: { id: pipelineId, chatId },
  });
  if (!pipeline) throw new Error("Pipeline not found or access denied");
  const updates = stageIds.map((id, index) =>
    prisma.cRMPipelineStage.update({
      where: { id },
      data: { order: index },
    })
  );
  return prisma.$transaction(updates);
}

export async function archiveStage(chatId, stageId, userId) {
  await validateOwnership({ userId, chatId });
  const stage = await prisma.cRMPipelineStage.findUnique({
    where: { id: stageId },
    include: { pipeline: true },
  });
  if (!stage || stage.pipeline.chatId !== chatId) {
    throw new Error("Stage not found or access denied");
  }
  return prisma.cRMPipelineStage.update({
    where: { id: stageId },
    data: { isClosed: true },
  });
}

export async function moveDealStage(chatId, dealId, stageId, userId) {
  await validateOwnership({ userId, chatId });
  const deal = await prisma.cRMDeal.findFirst({
    where: { id: dealId, chatId },
  });
  if (!deal) throw new Error("Deal not found or access denied");
  const stage = await prisma.cRMPipelineStage.findUnique({
    where: { id: stageId },
  });
  if (!stage) throw new Error("Stage not found");
  const oldStage = deal.stageId
    ? await prisma.cRMPipelineStage.findUnique({ where: { id: deal.stageId } })
    : null;
  const updatedDeal = await prisma.cRMDeal.update({
    where: { id: dealId },
    data: { stageId, pipelineId: stage.pipelineId },
  });
  await prisma.cRMActivity.create({
    data: {
      chatId,
      userId,
      dealId,
      activityType: "stage_change",
      title: `Stage changed from ${oldStage?.name || "None"} to ${stage.name}`,
      description: `Deal moved from "${oldStage?.name || "None"}" to "${stage.name}"`,
      source: "SYSTEM",
    },
  });
  return prisma.cRMDeal.findUnique({
    where: { id: dealId },
    include: { stage: true, pipeline: true, contact: true, company: true },
  });
}

export async function getDefaultPipeline(chatId) {
  const existing = await prisma.cRMPipeline.findFirst({
    where: { chatId, name: "Sales Pipeline" },
    include: { stages: { orderBy: { order: "asc" } } },
  });
  if (existing) return existing;
  return prisma.cRMPipeline.create({
    data: {
      chatId,
      name: "Sales Pipeline",
      description: "Default sales pipeline",
      stages: { create: DEFAULT_STAGES },
    },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}
