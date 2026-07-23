import prisma from "../../config/prisma.js";

export async function validateOwnership({ userId, chatId }) {
  const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
  if (!chat) throw new Error("Chat not found or access denied");
  return chat;
}

export function normalizeEmail(email) {
  if (!email || typeof email !== "string") return null;
  return email.trim().toLowerCase();
}

export function normalizePhone(phone) {
  if (!phone || typeof phone !== "string") return null;
  return phone.replace(/[^\d+]/g, "").substring(0, 20);
}

export async function loadContacts(chatId, filters = {}) {
  const where = { chatId, archivedAt: null, ...filters };
  return prisma.cRMContact.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function loadContactById(chatId, contactId) {
  return prisma.cRMContact.findFirst({ where: { id: contactId, chatId } });
}

export async function loadCompanies(chatId, filters = {}) {
  const where = { chatId, archivedAt: null, ...filters };
  return prisma.cRMCompany.findMany({ where, orderBy: { createdAt: "desc" } });
}

export async function loadCompanyById(chatId, companyId) {
  return prisma.cRMCompany.findFirst({ where: { id: companyId, chatId } });
}

export async function loadDeals(chatId, filters = {}) {
  const where = { chatId, archivedAt: null, ...filters };
  return prisma.cRMDeal.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { stage: true, pipeline: true, contact: true, company: true },
  });
}

export async function loadDealById(chatId, dealId) {
  return prisma.cRMDeal.findFirst({
    where: { id: dealId, chatId },
    include: { stage: true, pipeline: true, contact: true, company: true },
  });
}

export async function loadPipelines(chatId) {
  return prisma.cRMPipeline.findMany({
    where: { chatId, status: "ACTIVE" },
    include: { stages: { orderBy: { order: "asc" } }, _count: { select: { deals: true } } },
  });
}

export async function loadPipelineById(chatId, pipelineId) {
  return prisma.cRMPipeline.findFirst({
    where: { id: pipelineId, chatId },
    include: { stages: { orderBy: { order: "asc" } } },
  });
}

export async function loadTasks(chatId, filters = {}) {
  const where = { chatId, ...filters };
  return prisma.cRMTask.findMany({ where, orderBy: { dueAt: "asc" } });
}

export async function loadActivities(chatId, filters = {}) {
  const where = { chatId, ...filters };
  return prisma.cRMActivity.findMany({
    where,
    orderBy: { activityDate: "desc" },
    take: 50,
  });
}

export async function loadWorkflows(chatId, filters = {}) {
  const where = { chatId, ...filters };
  return prisma.cRMWorkflow.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: { _count: { select: { executions: true, versions: true } } },
  });
}

export async function loadWorkflowById(chatId, workflowId) {
  return prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
      executions: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
}

export async function loadAssociatedCampaignPlan(chatId) {
  return prisma.campaignPlan.findFirst({ where: { chatId } });
}

export async function loadAssociatedEmailCampaign(chatId) {
  return prisma.emailCampaign.findFirst({
    where: { chatId, status: { in: ["GENERATED", "APPROVED"] } },
    orderBy: { createdAt: "desc" },
  });
}

export async function loadCRMContext(chatId, userId) {
  await validateOwnership({ userId, chatId });

  const [contacts, companies, deals, pipelines, tasks, activities, workflows, campaignPlan, emailCampaign] =
    await Promise.all([
      loadContacts(chatId),
      loadCompanies(chatId),
      loadDeals(chatId).catch(() => []),
      loadPipelines(chatId).catch(() => []),
      loadTasks(chatId).catch(() => []),
      loadActivities(chatId).catch(() => []),
      loadWorkflows(chatId).catch(() => []),
      loadAssociatedCampaignPlan(chatId),
      loadAssociatedEmailCampaign(chatId),
    ]);

  return {
    contacts: { total: contacts.length, active: contacts.filter(c => c.status === "ACTIVE").length },
    companies: { total: companies.length },
    deals: { total: deals.length, open: deals.filter(d => d.status === "OPEN").length, byPipeline: aggregateDealsByPipeline(deals) },
    pipelines: pipelines.map(p => ({
      id: p.id, name: p.name, stages: p.stages, dealCount: p._count?.deals || 0,
    })),
    tasks: { total: tasks.length, due: tasks.filter(t => t.status === "TODO" && t.dueAt && new Date(t.dueAt) <= new Date()).length },
    activities: activities.slice(0, 10),
    workflows: { total: workflows.length, byStatus: aggregateWorkflowsByStatus(workflows) },
    campaignPlan: campaignPlan ? { id: campaignPlan.id, name: campaignPlan.executiveSummary?.campaignName } : null,
    emailCampaign: emailCampaign ? { id: emailCampaign.id, name: emailCampaign.name } : null,
  };
}

function aggregateDealsByPipeline(deals) {
  const map = {};
  for (const d of deals) {
    const pid = d.pipelineId || "none";
    if (!map[pid]) map[pid] = { pipelineId: pid, pipelineName: d.pipeline?.name || "Unassigned", count: 0 };
    map[pid].count++;
  }
  return Object.values(map);
}

function aggregateWorkflowsByStatus(workflows) {
  const map = {};
  for (const w of workflows) {
    map[w.status] = (map[w.status] || 0) + 1;
  }
  return map;
}
