import { prisma } from "../../config/prisma.js";
import { callAI } from "../../ai/services/aiRouter.service.js";
import { validateOwnership, loadDealById, loadContactById, loadCompanyById } from "./crm-data.service.js";

// ============================================
// PART 1: CRM INTELLIGENCE DASHBOARD
// ============================================

export async function getDashboard(chatId, userId) {
  await validateOwnership({ userId, chatId });

  const now = new Date();

  const [deals, contacts, tasks, activities, pipelines, workflows] = await Promise.all([
    prisma.cRMDeal.findMany({ where: { chatId, archivedAt: null }, include: { stage: true, pipeline: true } }),
    prisma.cRMContact.findMany({ where: { chatId, archivedAt: null }, select: { id: true, lifecycleStage: true, status: true, createdAt: true } }),
    prisma.cRMTask.findMany({ where: { chatId }, select: { id: true, status: true, dueAt: true, priority: true } }),
    prisma.cRMActivity.findMany({ where: { chatId }, orderBy: { activityDate: "desc" }, take: 500, select: { id: true, activityType: true, activityDate: true } }),
    prisma.cRMPipeline.findMany({ where: { chatId, status: "ACTIVE" }, include: { stages: { orderBy: { order: "asc" } } } }),
    prisma.cRMWorkflow.findMany({ where: { chatId }, select: { id: true, status: true } }),
  ]);

  const openDeals = deals.filter(d => d.status === "OPEN");
  const wonDeals = deals.filter(d => d.status === "WON");
  const lostDeals = deals.filter(d => d.status === "LOST");

  const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const tasksDueToday = tasks.filter(t => t.status === "TODO" && t.dueAt && new Date(t.dueAt) <= new Date(todayStart.getTime() + 86400000) && new Date(t.dueAt) >= todayStart);
  const overdueTasks = tasks.filter(t => t.status === "TODO" && t.dueAt && new Date(t.dueAt) < now);
  const followUpsNeeded = contacts.filter(c => {
    const lastAct = activities.find(a => a.activityType !== "note");
    if (!lastAct) return true;
    return (now.getTime() - new Date(lastAct.activityDate).getTime()) > 7 * 86400000;
  }).length;

  const pipelineHealth = pipelines.map(p => {
    const pDeals = openDeals.filter(d => d.pipelineId === p.id);
    const stageDist = (p.stages || []).map(s => ({
      stageId: s.id, stageName: s.name, order: s.order, dealCount: pDeals.filter(d => d.stageId === s.id).length,
    }));
    return { pipelineId: p.id, pipelineName: p.name, stageDistribution: stageDist, totalDeals: pDeals.length };
  });

  const avgDealAge = openDeals.length > 0
    ? openDeals.reduce((sum, d) => sum + (now.getTime() - new Date(d.createdAt).getTime()), 0) / openDeals.length / 86400000
    : null;

  const staleDeals = openDeals.filter(d => {
    const lastAct = activities.find(a => a.dealId === d.id);
    if (!lastAct) return true;
    return (now.getTime() - new Date(lastAct.activityDate).getTime()) > 14 * 86400000;
  }).length;

  const lifecycleDist = {};
  for (const c of contacts) {
    const stage = c.lifecycleStage || "NOT_MEASURED";
    lifecycleDist[stage] = (lifecycleDist[stage] || 0) + 1;
  }

  const wonTrend = wonDeals.reduce((acc, d) => {
    const m = d.updatedAt ? `${d.updatedAt.getFullYear()}-${String(d.updatedAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});
  const lostTrend = lostDeals.reduce((acc, d) => {
    const m = d.updatedAt ? `${d.updatedAt.getFullYear()}-${String(d.updatedAt.getMonth() + 1).padStart(2, "0")}` : "unknown";
    acc[m] = (acc[m] || 0) + 1;
    return acc;
  }, {});

  return {
    pipelineHealth,
    avgDealAge: avgDealAge !== null ? { value: Math.round(avgDealAge * 10) / 10, unit: "days", inferenceStatus: "EVIDENCE_BACKED" } : { value: null, inferenceStatus: "NOT_MEASURED" },
    closingProbability: { value: deals.length > 0 ? Math.round((wonDeals.length / deals.length) * 100) : null, inferenceStatus: "EVIDENCE_BACKED" },
    leadScoreDistribution: lifecycleDist,
    tasksDueToday: { count: tasksDueToday.length, overdue: overdueTasks.length, inferenceStatus: "EVIDENCE_BACKED" },
    followUpsNeeded: { count: followUpsNeeded, inferenceStatus: "AI_INFERRED" },
    staleDeals: { count: staleDeals, inferenceStatus: "EVIDENCE_BACKED" },
    wonLostTrend: { won: wonTrend, lost: lostTrend, inferenceStatus: "EVIDENCE_BACKED" },
    revenueForecast: { value: null, inferenceStatus: "NOT_MEASURED" },
    totals: { deals: deals.length, openDeals: openDeals.length, contacts: contacts.length, tasks: tasks.length, activities: activities.length, workflows: workflows.length },
  };
}

// ============================================
// PART 2: AI DEAL INSIGHTS
// ============================================

export async function getDealInsights(chatId, userId, dealId) {
  await validateOwnership({ userId, chatId });
  const deal = await loadDealById(chatId, dealId);
  if (!deal) throw new Error("Deal not found");

  const existing = await prisma.dealInsight.findFirst({ where: { dealId, chatId }, orderBy: { createdAt: "desc" } });
  if (existing && existing.generationStatus === "completed") return existing;

  const [activities, tasks, contact, company] = await Promise.all([
    prisma.cRMActivity.findMany({ where: { dealId, chatId }, orderBy: { activityDate: "desc" }, take: 20 }),
    prisma.cRMTask.findMany({ where: { dealId, chatId }, orderBy: { createdAt: "desc" }, take: 10 }),
    deal.contactId ? loadContactById(chatId, deal.contactId) : null,
    deal.companyId ? loadCompanyById(chatId, deal.companyId) : null,
  ]);

  const prompt = `Analyze this sales deal for FleetNimble. Use ONLY the data provided.

DEAL: ${deal.name || "Unnamed"}
STATUS: ${deal.status}
VALUE: ${deal.value != null ? `${deal.value} ${deal.currency || "USD"}` : "Not set"}
STAGE: ${deal.stage?.name || "Not assigned"}
PIPELINE: ${deal.pipeline?.name || "Not assigned"}
CONTACT: ${contact ? `${contact.firstName} ${contact.lastName || ""} - ${contact.jobTitle || ""}` : "Not available"}
COMPANY: ${company ? `${company.name} - ${company.industry || ""}` : "Not available"}
CREATED: ${deal.createdAt?.toISOString?.() || ""}
EXPECTED CLOSE: ${deal.expectedCloseDate?.toISOString?.() || "Not set"}

RECENT ACTIVITIES (${activities.length}):
${activities.map(a => `- ${a.activityType}: ${a.title} (${a.activityDate?.toISOString?.()?.split("T")[0] || ""})`).join("\n") || "None"}

TASKS (${tasks.length}):
${tasks.map(t => `- ${t.title} [${t.status}] due: ${t.dueAt?.toISOString?.()?.split("T")[0] || "not set"}`).join("\n") || "None"}

Return ONLY valid JSON. No markdown.
{
  "aiSummary": "2-3 sentence summary of deal status",
  "buyingSignals": [{"signal": "signal description", "evidence": "from data above", "inferenceStatus": "EVIDENCE_BACKED|AI_INFERRED"}],
  "riskFactors": [{"risk": "risk description", "severity": "LOW|MEDIUM|HIGH", "evidence": "from data", "inferenceStatus": "EVIDENCE_BACKED|AI_INFERRED|NOT_MEASURED"}],
  "recommendedNextStep": {"action": "specific action", "reason": "why", "evidence": "from data", "inferenceStatus": "AI_INFERRED"},
  "competitorMention": null,
  "fleetSizeEstimate": {"estimate": null, "evidence": "Not available", "inferenceStatus": "NOT_MEASURED"},
  "decisionMakerConfidence": {"confidence": null, "evidence": "Not available", "inferenceStatus": "NOT_MEASURED"},
  "timelinePrediction": {"predictedCloseDate": null, "probability": null, "inferenceStatus": "NOT_MEASURED"}
}`;

  const insight = existing || await prisma.dealInsight.create({
    data: { chatId, userId, dealId, generationStatus: "running" },
  });

  try {
    const result = await callAI(prompt);
    if (result.success && result.data) {
      const d = result.data;
      await prisma.dealInsight.update({
        where: { id: insight.id },
        data: {
          aiSummary: d.aiSummary || null,
          buyingSignals: d.buyingSignals || [],
          riskFactors: d.riskFactors || [],
          recommendedNextStep: d.recommendedNextStep || null,
          competitorMention: d.competitorMention || null,
          fleetSizeEstimate: d.fleetSizeEstimate || null,
          decisionMakerConfidence: d.decisionMakerConfidence || null,
          timelinePrediction: d.timelinePrediction || null,
          generationStatus: "completed",
          provider: result.provider || null,
        },
      });
    } else {
      await prisma.dealInsight.update({
        where: { id: insight.id },
        data: {
          aiSummary: "AI analysis unavailable.",
          generationStatus: "failed",
        },
      });
    }
  } catch (e) {
    await prisma.dealInsight.update({
      where: { id: insight.id },
      data: { aiSummary: `Analysis failed: ${e.message}`, generationStatus: "failed" },
    });
  }

  await storeMemory(chatId, userId, "deal_insight", {
    summary: `AI analysis generated for deal: ${deal.name}`,
    dealId, contactId: deal.contactId, companyId: deal.companyId,
  });

  return prisma.dealInsight.findUnique({ where: { id: insight.id } });
}

// ============================================
// PART 3: SMART FOLLOW-UP GENERATOR
// ============================================

export async function generateFollowUp(chatId, userId, dealId, channel) {
  await validateOwnership({ userId, chatId });
  const deal = await loadDealById(chatId, dealId);
  if (!deal) throw new Error("Deal not found");

  const [activities, tasks, contact, company] = await Promise.all([
    prisma.cRMActivity.findMany({ where: { dealId, chatId }, orderBy: { activityDate: "desc" }, take: 10 }),
    prisma.cRMTask.findMany({ where: { dealId, chatId }, orderBy: { createdAt: "desc" }, take: 5 }),
    deal.contactId ? loadContactById(chatId, deal.contactId) : null,
    deal.companyId ? loadCompanyById(chatId, deal.companyId) : null,
  ]);

  const channelLabel = { email: "Email", phone: "Phone Script", whatsapp: "WhatsApp Message", linkedin: "LinkedIn Message", meeting: "Meeting Agenda" }[channel] || "Email";
  const channels = ["email", "phone", "whatsapp", "linkedin", "meeting"];

  const prompt = `Generate a ${channelLabel} follow-up for this FleetNimble deal.

DEAL: ${deal.name}
STAGE: ${deal.stage?.name || "Not assigned"}
CONTACT: ${contact ? `${contact.firstName} ${contact.lastName || ""}` : "Not available"}
COMPANY: ${company?.name || "Not available"}
LAST ACTIVITIES: ${activities.map(a => `[${a.activityType}] ${a.title}`).join(" | ") || "None"}
OPEN TASKS: ${tasks.filter(t => t.status !== "COMPLETED").map(t => t.title).join(" | ") || "None"}

Return ONLY valid JSON. No markdown. For ${channel} channel:
${channel === "email" ? `{"subjectLine": "...", "body": "...", "cta": "..."}` : ""}
${channel === "phone" ? `{"opening": "...", "keyPoints": ["...","..."], "objectionHandling": {"objection": "...","response": "..."}, "closing": "..."}` : ""}
${channel === "whatsapp" ? `{"message": "..."}` : ""}
${channel === "linkedin" ? `{"subjectLine": "...", "message": "..."}` : ""}
${channel === "meeting" ? `{"agenda": ["...","..."], "objectives": ["...","..."], "questionsToAsk": ["...","..."], "proposedDuration": "30 min"}` : ""}

CRITICAL: No fake stats, no testimonials, no "studies show".`;

  const result = await callAI(prompt);
  const content = result.success && result.data ? result.data : { _fallback: true, message: "AI generation unavailable." };

  await storeMemory(chatId, userId, "follow_up", {
    summary: `${channelLabel} follow-up generated for deal: ${deal.name}`,
    dealId, contactId: deal.contactId, companyId: deal.companyId,
    metadata: { channel, provider: result.provider || null },
  });

  return {
    channel,
    content,
    dealId,
    contactId: deal.contactId,
    companyId: deal.companyId,
    provider: result.provider || null,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================
// PART 4: NEXT BEST ACTION ENGINE
// ============================================

export async function getNextBestAction(chatId, userId, contactId) {
  await validateOwnership({ userId, chatId });
  const contact = await prisma.cRMContact.findFirst({
    where: { id: contactId, chatId },
    include: { deals: { where: { archivedAt: null }, include: { stage: true } }, tasks: { where: { status: { not: "COMPLETED" } }, take: 5 }, activities: { orderBy: { activityDate: "desc" }, take: 10 }, company: true },
  });
  if (!contact) throw new Error("Contact not found");

  const hasDeals = contact.deals.length > 0;
  const hasTasks = contact.tasks.length > 0;
  const hasRecentActivity = contact.activities.length > 0 && (Date.now() - new Date(contact.activities[0].activityDate).getTime()) < 7 * 86400000;
  const hasCompany = !!contact.companyId;
  const hasEmail = !!contact.email;
  const hasPhone = !!contact.phone;
  const isActive = contact.status === "ACTIVE";
  const hasOwner = !!contact.ownerId;
  const lifecycle = contact.lifecycleStage;

  const actions = [];
  if (!hasOwner) actions.push({ action: "Assign Sales Rep", reason: "No owner assigned to this contact.", priority: "HIGH", inferenceStatus: "EVIDENCE_BACKED" });
  if (!hasRecentActivity && isActive) actions.push({ action: "Call Today", reason: `No activity in the last 7 days. Last: ${contact.activities[0]?.activityType || "none"}`, priority: "HIGH", inferenceStatus: "EVIDENCE_BACKED" });
  if (lifecycle === "LEAD" && !hasDeals) actions.push({ action: "Send Pricing", reason: "Lead stage with no active deals. Share pricing to advance.", priority: "MEDIUM", inferenceStatus: "AI_INFERRED" });
  if (lifecycle === "MARKETING_QUALIFIED" && !hasDeals) actions.push({ action: "Schedule Demo", reason: "MQL with no deals. Schedule product demonstration.", priority: "HIGH", inferenceStatus: "AI_INFERRED" });
  if (hasDeals && contact.deals.some(d => d.stage?.isClosed !== true)) {
    actions.push({ action: "Move Deal Stage", reason: `Active deal in "${contact.deals[0].stage?.name || "unknown"}" stage. Review and advance.`, priority: "MEDIUM", inferenceStatus: "EVIDENCE_BACKED" });
  }
  if (!hasEmail && !hasPhone) actions.push({ action: "Update Contact Info", reason: "Missing email and phone for this contact.", priority: "HIGH", inferenceStatus: "EVIDENCE_BACKED" });
  if (hasTasks && contact.tasks.some(t => t.status === "TODO")) {
    const overdueTasks = contact.tasks.filter(t => t.dueAt && new Date(t.dueAt) < new Date());
    if (overdueTasks.length > 0) actions.push({ action: "Follow Up on Overdue Tasks", reason: `${overdueTasks.length} overdue task(s) requiring attention.`, priority: "HIGH", inferenceStatus: "EVIDENCE_BACKED" });
  }
  if (!hasCompany) actions.push({ action: "Associate Company", reason: "No company linked to this contact.", priority: "LOW", inferenceStatus: "EVIDENCE_BACKED" });
  if (lifecycle === "SUBSCRIBER" || lifecycle === "NOT_MEASURED") actions.push({ action: "Create Follow-up Task", reason: `${lifecycle === "SUBSCRIBER" ? "Subscriber" : "Unknown lifecycle"} — needs initial outreach.`, priority: "MEDIUM", inferenceStatus: "AI_INFERRED" });

  const priorityOrder = { HIGH: 0, MEDIUM: 1, LOW: 2, URGENT: -1 };
  actions.sort((a, b) => (priorityOrder[a.priority] || 3) - (priorityOrder[b.priority] || 3));

  const topAction = actions[0] || { action: "Monitor", reason: "No specific action needed at this time.", priority: "LOW", inferenceStatus: "AI_INFERRED" };

  await storeMemory(chatId, userId, "nba", {
    summary: `Next best action for ${contact.firstName} ${contact.lastName || ""}: ${topAction.action}`,
    contactId, companyId: contact.companyId,
  });

  return { contactId, contactName: `${contact.firstName} ${contact.lastName || ""}`.trim(), topAction, allActions: actions, generatedAt: new Date().toISOString() };
}

// ============================================
// PART 5: OPPORTUNITY SCORING
// ============================================

export async function scoreOpportunity(chatId, userId, dealId) {
  await validateOwnership({ userId, chatId });
  const deal = await loadDealById(chatId, dealId);
  if (!deal) throw new Error("Deal not found");

  const [activities, tasks] = await Promise.all([
    prisma.cRMActivity.findMany({ where: { dealId, chatId }, orderBy: { activityDate: "desc" }, take: 50 }),
    prisma.cRMTask.findMany({ where: { dealId, chatId } }),
  ]);

  const lastActivityDays = activities.length > 0 ? (Date.now() - new Date(activities[0].activityDate).getTime()) / 86400000 : 999;
  const activityCount30d = activities.filter(a => (Date.now() - new Date(a.activityDate).getTime()) < 30 * 86400000).length;
  const completedTasks = tasks.filter(t => t.status === "COMPLETED").length;
  const totalTasks = tasks.length;
  const taskProgress = totalTasks > 0 ? completedTasks / totalTasks : 0;

  const urgency = deal.expectedCloseDate ? Math.max(0, Math.min(100, Math.round((1 - (new Date(deal.expectedCloseDate).getTime() - Date.now()) / (90 * 86400000)) * 100))) : null;
  const engagement = lastActivityDays < 7 ? "HIGH" : lastActivityDays < 30 ? "MEDIUM" : "LOW";
  const velocity = activityCount30d > 0 ? `${Math.round(activityCount30d / 4.3)} activities/week` : null;

  const score = {
    priority: deal.value != null && deal.value > 50000 ? "HIGH" : deal.value != null && deal.value > 10000 ? "MEDIUM" : "LOW",
    urgency: urgency != null ? { value: urgency, inferenceStatus: "EVIDENCE_BACKED" } : { value: null, inferenceStatus: "NOT_MEASURED" },
    buyingIntent: engagement === "HIGH" && taskProgress > 0.5 ? { value: "HIGH", inferenceStatus: "AI_INFERRED" } : { value: "MEDIUM", inferenceStatus: "AI_INFERRED" },
    engagementScore: { value: engagement, inferenceStatus: "EVIDENCE_BACKED" },
    pipelineVelocity: velocity ? { value: velocity, inferenceStatus: "EVIDENCE_BACKED" } : { value: null, inferenceStatus: "NOT_MEASURED" },
    evidenceQuality: activityCount30d > 5 ? "HIGH" : activityCount30d > 0 ? "MEDIUM" : "LOW",
  };

  await storeMemory(chatId, userId, "scoring", {
    summary: `Opportunity scored for deal: ${deal.name}`,
    dealId, contactId: deal.contactId, companyId: deal.companyId,
    metadata: score,
  });

  return { dealId, dealName: deal.name, score, calculatedAt: new Date().toISOString() };
}

// ============================================
// PART 6: SALES TIMELINE
// ============================================

export async function getSalesTimeline(chatId, userId, options = {}) {
  await validateOwnership({ userId, chatId });

  const { contactId, dealId, cursor, limit = 50 } = options;
  const where = { chatId };
  if (contactId) where.contactId = contactId;
  if (dealId) where.dealId = dealId;

  const activities = await prisma.cRMActivity.findMany({
    where: { ...where, ...(cursor ? { id: { lt: cursor } } : {}) },
    orderBy: { activityDate: "desc" },
    take: limit + 1,
    include: { contact: { select: { id: true, firstName: true, lastName: true } }, deal: { select: { id: true, name: true } } },
  });

  const hasMore = activities.length > limit;
  if (hasMore) activities.pop();
  const nextCursor = hasMore ? activities[activities.length - 1]?.id : null;

  return { items: activities, nextCursor, hasMore };
}

// ============================================
// PART 7: CONVERSATION MEMORY
// ============================================

async function storeMemory(chatId, userId, interactionType, data) {
  try {
    await prisma.salesCopilotMemory.create({
      data: {
        chatId, userId,
        contactId: data.contactId || null,
        companyId: data.companyId || null,
        dealId: data.dealId || null,
        interactionType,
        summary: data.summary || null,
        intent: data.intent || interactionType,
        recommendations: data.recommendations || [],
        nextAction: data.nextAction || null,
        metadata: data.metadata || {},
        source: "AI_GENERATED",
      },
    });
  } catch (e) {
    console.warn("[SalesCopilot] Memory store failed:", e.message);
  }
}

export async function getConversationMemory(chatId, userId, filters = {}) {
  await validateOwnership({ userId, chatId });
  const where = { chatId, ...filters };
  return prisma.salesCopilotMemory.findMany({
    where,
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}

// ============================================
// PART 8: AI MEETING PREPARATION
// ============================================

export async function getMeetingPrep(chatId, userId, contactId) {
  await validateOwnership({ userId, chatId });
  const contact = await prisma.cRMContact.findFirst({
    where: { id: contactId, chatId },
    include: {
      company: true,
      deals: { where: { archivedAt: null }, include: { stage: true, pipeline: true } },
      tasks: { where: { status: { not: "COMPLETED" } }, orderBy: { createdAt: "desc" }, take: 10 },
      activities: { orderBy: { activityDate: "desc" }, take: 20 },
      salesCopilotMemories: { orderBy: { createdAt: "desc" }, take: 10 },
    },
  });
  if (!contact) throw new Error("Contact not found");

  const prompt = `Prepare a meeting briefing for FleetNimble sales rep meeting this contact.

CONTACT: ${contact.firstName} ${contact.lastName || ""}
TITLE: ${contact.jobTitle || "Not available"}
COMPANY: ${contact.company?.name || "Not available"}
INDUSTRY: ${contact.company?.industry || "Not available"}
EMAIL: ${contact.email || "Not available"}
PHONE: ${contact.phone || "Not available"}
LIFECYCLE: ${contact.lifecycleStage}

ACTIVE DEALS: ${contact.deals.map(d => `${d.name} [${d.stage?.name || "N/A"}]`).join(" | ") || "None"}
OPEN TASKS: ${contact.tasks.map(t => `- ${t.title}`).join("\n") || "None"}
RECENT ACTIVITIES: ${contact.activities.slice(0, 5).map(a => `${a.activityType}: ${a.title} (${a.activityDate?.toISOString()?.split("T")[0] || ""})`).join(" | ")}

Return ONLY valid JSON. No markdown.
{
  "companySummary": "2-3 sentence company overview",
  "pastConversationsSummary": "Key topics from recent interactions",
  "openTasks": ["task1", "task2"],
  "currentDeals": [{"name": "deal name", "stage": "stage", "value": null}],
  "painPoints": ["pain point 1"],
  "questionsToAsk": ["question 1"],
  "demoSuggestions": ["suggestion 1"],
  "meetingObjective": "Primary objective for this meeting"
}`;

  const result = await callAI(prompt);
  const prep = result.success && result.data ? result.data : {
    companySummary: contact.company?.name ? `${contact.company.name} - ${contact.company.industry || "Industry not specified"}` : "Not available",
    pastConversationsSummary: "AI analysis unavailable",
    openTasks: contact.tasks.map(t => t.title),
    currentDeals: contact.deals.map(d => ({ name: d.name, stage: d.stage?.name || "N/A", value: d.value })),
    painPoints: [],
    questionsToAsk: [],
    demoSuggestions: [],
    meetingObjective: "Not available",
  };

  return {
    contact: { id: contact.id, name: `${contact.firstName} ${contact.lastName || ""}`.trim(), email: contact.email, phone: contact.phone },
    company: contact.company ? { name: contact.company.name, industry: contact.company.industry } : null,
    ...prep,
    provider: result.provider || null,
    generatedAt: new Date().toISOString(),
  };
}

// ============================================
// PART 9: PROPOSAL GENERATOR
// ============================================

export async function generateProposal(chatId, userId, dealId) {
  await validateOwnership({ userId, chatId });
  const deal = await loadDealById(chatId, dealId);
  if (!deal) throw new Error("Deal not found");

  const [contact, company] = await Promise.all([
    deal.contactId ? loadContactById(chatId, deal.contactId) : null,
    deal.companyId ? loadCompanyById(chatId, deal.companyId) : null,
  ]);

  const prompt = `Generate a FleetNimble proposal for this deal. FleetNimble is a fleet management and telematics solution.

DEAL: ${deal.name}
CONTACT: ${contact ? `${contact.firstName} ${contact.lastName || ""} - ${contact.jobTitle || ""}` : "Not available"}
COMPANY: ${company ? `${company.name} - ${company.industry || ""}` : "Not available"}
VALUE: ${deal.value != null ? `${deal.value} ${deal.currency || "USD"}` : "Not specified"}

Return ONLY valid JSON. No markdown.
{
  "title": "Proposal title",
  "executiveSummary": "2-3 paragraph executive summary",
  "pricingSummary": [{"item": "FleetNimble Platform", "description": "Annual subscription per vehicle", "unitPrice": null, "quantity": null, "total": null}],
  "fleetRecommendations": [{"vehicleType": "Light Fleet", "quantity": null, "reason": "Recommended based on company profile", "estimatedCost": null}],
  "implementationTimeline": [{"phase": "Phase 1: Onboarding", "duration": "Week 1-2", "milestones": ["Account setup", "Hardware installation"]}],
  "status": "DRAFT"
}

CRITICAL: Do NOT fabricate pricing, quantities, or costs. Use null for unknown values.`;

  const result = await callAI(prompt);
  const content = result.success && result.data ? result.data : {
    title: `${deal.name} - Proposal`,
    executiveSummary: "Not available - AI generation failed.",
    pricingSummary: [],
    fleetRecommendations: [],
    implementationTimeline: [],
  };

  const proposal = await prisma.proposal.create({
    data: {
      chatId, userId,
      dealId: deal.id,
      contactId: deal.contactId,
      companyId: deal.companyId,
      title: content.title || `${deal.name} - Proposal`,
      proposalType: "standard",
      executiveSummary: content.executiveSummary || null,
      pricingSummary: content.pricingSummary || [],
      fleetRecommendations: content.fleetRecommendations || [],
      implementationTimeline: content.implementationTimeline || [],
      content,
      generatedBy: "AI_GENERATED",
      provider: result.provider || null,
    },
  });

  await storeMemory(chatId, userId, "proposal", {
    summary: `Proposal generated: ${proposal.title}`,
    dealId, contactId: deal.contactId, companyId: deal.companyId,
  });

  return proposal;
}

export async function listProposals(chatId, userId, dealId) {
  await validateOwnership({ userId, chatId });
  return prisma.proposal.findMany({
    where: { chatId, ...(dealId ? { dealId } : {}) },
    orderBy: { createdAt: "desc" },
  });
}

// ============================================
// PART 10: CUSTOMER HEALTH
// ============================================

export async function getCustomerHealth(chatId, userId) {
  await validateOwnership({ userId, chatId });

  const now = new Date();
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 86400000);

  const [contacts, deals, tasks, activities] = await Promise.all([
    prisma.cRMContact.findMany({ where: { chatId, archivedAt: null }, select: { id: true, firstName: true, lastName: true, email: true, ownerId: true, status: true, companyId: true, createdAt: true } }),
    prisma.cRMDeal.findMany({ where: { chatId, archivedAt: null }, select: { id: true, name: true, status: true, stageId: true, contactId: true, updatedAt: true, createdAt: true } }),
    prisma.cRMTask.findMany({ where: { chatId }, select: { id: true, title: true, status: true, dueAt: true, contactId: true, dealId: true } }),
    prisma.cRMActivity.findMany({ where: { chatId, activityDate: { gte: thirtyDaysAgo } }, select: { id: true, activityType: true, activityDate: true, contactId: true, dealId: true } }),
  ]);

  const recentContactIds = new Set(activities.filter(a => a.contactId).map(a => a.contactId));
  const recentDealIds = new Set(activities.filter(a => a.dealId).map(a => a.dealId));

  const healthChecks = contacts.map(c => {
    const contactDeals = deals.filter(d => d.contactId === c.id);
    const contactTasks = tasks.filter(t => t.contactId === c.id);
    const hasRecentActivity = recentContactIds.has(c.id);
    const openDeals = contactDeals.filter(d => d.status === "OPEN");
    const overdueTasks = contactTasks.filter(t => t.status === "TODO" && t.dueAt && new Date(t.dueAt) < now);
    const staleDeal = openDeals.some(d => !recentDealIds.has(d.id));
    const daysSinceLastActivity = hasRecentActivity ? 0 : Math.round((now.getTime() - new Date(c.createdAt).getTime()) / 86400000);

    const flags = [];
    if (daysSinceLastActivity > 14) flags.push({ flag: "No Recent Activity", reason: `${daysSinceLastActivity} days since last activity`, severity: daysSinceLastActivity > 30 ? "HIGH" : "MEDIUM" });
    if (!c.ownerId) flags.push({ flag: "No Assigned Owner", reason: "Contact has no sales rep assigned", severity: "HIGH" });
    if (overdueTasks.length > 0) flags.push({ flag: "Overdue Tasks", reason: `${overdueTasks.length} overdue task(s)`, severity: "MEDIUM" });
    if (staleDeal) flags.push({ flag: "Stale Deal", reason: "Open deal with no recent activity", severity: "HIGH" });
    if (openDeals.length === 0 && daysSinceLastActivity > 7) flags.push({ flag: "No Active Deals", reason: "No open deals and inactive", severity: "MEDIUM" });

    const status = flags.some(f => f.severity === "HIGH") ? "AT_RISK" : flags.length > 0 ? "NEEDS_ATTENTION" : "HEALTHY";

    return {
      contactId: c.id, contactName: `${c.firstName} ${c.lastName || ""}`.trim(), email: c.email,
      healthStatus: status, riskFlags: flags, daysSinceLastActivity, openDealCount: openDeals.length,
      overdueTaskCount: overdueTasks.length, staleDeal,
    };
  });

  const summary = {
    healthy: healthChecks.filter(h => h.healthStatus === "HEALTHY").length,
    needsAttention: healthChecks.filter(h => h.healthStatus === "NEEDS_ATTENTION").length,
    atRisk: healthChecks.filter(h => h.healthStatus === "AT_RISK").length,
    total: healthChecks.length,
  };

  const inactiveCustomers = healthChecks.filter(h => h.daysSinceLastActivity > 14);
  const noFollowUp = healthChecks.filter(h => h.healthStatus === "NEEDS_ATTENTION" && h.daysSinceLastActivity > 7);
  const dealsStuck = deals.filter(d => d.status === "OPEN" && !recentDealIds.has(d.id)).length;
  const missedMeetings = tasks.filter(t => t.status === "TODO" && t.dueAt && new Date(t.dueAt) < now).length;
  const noOwnerAssigned = healthChecks.filter(h => !h.ownerId).length;

  await prisma.customerHealthSnapshot.create({
    data: {
      chatId, userId,
      healthStatus: summary.atRisk > summary.healthy ? "AT_RISK" : summary.needsAttention > 0 ? "NEEDS_ATTENTION" : "HEALTHY",
      riskFlags: healthChecks.filter(h => h.riskFlags.length > 0).flatMap(h => h.riskFlags).slice(0, 50),
      inactivityDays: Math.round(healthChecks.reduce((s, h) => s + h.daysSinceLastActivity, 0) / (healthChecks.length || 1)),
      openDealCount: deals.filter(d => d.status === "OPEN").length,
      overdueTaskCount: missedMeetings,
      staleDeal,
    },
  });

  return {
    summary,
    contactHealth: healthChecks.slice(0, 100),
    inactiveCustomers: { count: inactiveCustomers.length, inferenceStatus: "EVIDENCE_BACKED" },
    noFollowUp: { count: noFollowUp.length, inferenceStatus: "EVIDENCE_BACKED" },
    dealsStuck: { count: dealsStuck, inferenceStatus: "EVIDENCE_BACKED" },
    missedMeetings: { count: missedMeetings, inferenceStatus: "EVIDENCE_BACKED" },
    noOwnerAssigned: { count: noOwnerAssigned, inferenceStatus: "EVIDENCE_BACKED" },
    calculatedAt: new Date().toISOString(),
  };
}

// ============================================
// PART 11: AUTOMATION
// ============================================

export async function runAutomation(chatId, userId, action, config) {
  await validateOwnership({ userId, chatId });

  const results = [];

  switch (action) {
    case "CREATE_TASK": {
      const task = await prisma.cRMTask.create({
        data: { chatId, userId, title: config.title || "Follow-up task", description: config.description, priority: config.priority || "MEDIUM", dueAt: config.dueAt ? new Date(config.dueAt) : null, assignedTo: config.assignedTo, contactId: config.contactId, companyId: config.companyId, dealId: config.dealId, source: "WORKFLOW" },
      });
      results.push({ action: "task_created", taskId: task.id });
      break;
    }
    case "SCHEDULE_FOLLOW_UP": {
      const days = config.days || 7;
      const dueAt = new Date(Date.now() + days * 86400000);
      const fupTask = await prisma.cRMTask.create({
        data: { chatId, userId, title: config.title || `Follow-up: ${config.reason || "Scheduled"}`, priority: "MEDIUM", dueAt, assignedTo: config.assignedTo, contactId: config.contactId, dealId: config.dealId, source: "WORKFLOW" },
      });
      results.push({ action: "follow_up_scheduled", taskId: fupTask.id, dueAt: dueAt.toISOString() });
      break;
    }
    case "NOTIFY_OWNER": {
      if (config.ownerId) {
        await prisma.notification.create({
          data: { userId: config.ownerId, title: config.title || "CRM Alert", message: config.message || "Action required", type: "crm_automation" },
        });
        results.push({ action: "notification_sent", userId: config.ownerId });
      }
      break;
    }
    case "CREATE_ACTIVITY": {
      const act = await prisma.cRMActivity.create({
        data: { chatId, userId, activityType: config.activityType || "note", title: config.title || "Automated activity", description: config.description, contactId: config.contactId, companyId: config.companyId, dealId: config.dealId, source: "SYSTEM" },
      });
      results.push({ action: "activity_created", activityId: act.id });
      break;
    }
    case "ESCALATE_DEAL": {
      if (config.dealId) {
        const updated = await prisma.cRMDeal.update({ where: { id: config.dealId }, data: { metadata: { escalated: true, escalatedAt: new Date().toISOString(), reason: config.reason || "Automated escalation" } } });
        results.push({ action: "deal_escalated", dealId: config.dealId });
      }
      break;
    }
    default:
      throw new Error(`Unknown automation action: ${action}`);
  }

  return { action, config, results, executedAt: new Date().toISOString() };
}

// ============================================
// PART 12: NOTIFICATIONS
// ============================================

export async function getCopilotNotifications(chatId, userId) {
  await validateOwnership({ userId, chatId });

  const now = new Date();
  const notifications = [];

  const pendingTasks = await prisma.cRMTask.count({ where: { chatId, status: "TODO", dueAt: { lte: now } } });
  if (pendingTasks > 0) notifications.push({ type: "TASK_DUE", message: `${pendingTasks} task(s) overdue`, severity: "WARNING", count: pendingTasks });

  const staleDeals = await prisma.cRMDeal.count({ where: { chatId, status: "OPEN", archivedAt: null, updatedAt: { lte: new Date(now.getTime() - 14 * 86400000) } } });
  if (staleDeals > 0) notifications.push({ type: "DEAL_RISK", message: `${staleDeals} deal(s) stale (no activity in 14+ days)`, severity: "WARNING", count: staleDeals });

  const pendingWorkflows = await prisma.cRMWorkflow.count({ where: { chatId, approvalStatus: "PENDING_REVIEW" } });
  if (pendingWorkflows > 0) notifications.push({ type: "WORKFLOW_APPROVAL", message: `${pendingWorkflows} workflow(s) pending review`, severity: "INFO", count: pendingWorkflows });

  const contactsNoOwner = await prisma.cRMContact.count({ where: { chatId, archivedAt: null, ownerId: null } });
  if (contactsNoOwner > 0) notifications.push({ type: "FOLLOW_UP_NEEDED", message: `${contactsNoOwner} contact(s) with no assigned owner`, severity: "INFO", count: contactsNoOwner });

  return { notifications, generatedAt: new Date().toISOString() };
}

// ============================================
// PART 13: PERFORMANCE HELPERS
// ============================================

export async function paginatedQuery(model, where, options = {}) {
  const { cursor, limit = 50, orderBy = { createdAt: "desc" }, include } = options;
  const items = await prisma[model].findMany({
    where,
    ...(cursor ? { cursor: { id: cursor }, skip: 1 } : {}),
    take: limit + 1,
    orderBy,
    include,
  });
  const hasMore = items.length > limit;
  if (hasMore) items.pop();
  const nextCursor = hasMore ? items[items.length - 1]?.id : null;
  return { items, nextCursor, hasMore };
}
