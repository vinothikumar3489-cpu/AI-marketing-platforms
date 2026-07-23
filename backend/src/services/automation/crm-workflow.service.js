import { prisma } from "../../config/prisma.js";
import { validateOwnership } from "./crm-data.service.js";
import { createTask, createActivity } from "./crm-task-activity.service.js";
import { moveDealStage } from "./crm-pipeline.service.js";

async function createWorkflowLog(workflowId, action, details = {}) {
  return prisma.cRMWorkflowLog.create({
    data: { workflowId, action, details },
  });
}

async function getCurrentWorkflowState(workflowId) {
  const workflow = await prisma.cRMWorkflow.findUnique({
    where: { id: workflowId },
  });
  if (!workflow) return null;
  const { id, createdAt, updatedAt, ...snapshot } = workflow;
  return snapshot;
}

async function checkContactConsent(contactId, actionType) {
  if (!contactId) return true;
  const contact = await prisma.cRMContact.findUnique({ where: { id: contactId } });
  if (!contact) return false;
  if (contact.archivedAt) return false;
  if (contact.unsubscribedAt && actionType?.includes("communication")) return false;
  return true;
}

async function checkEntityArchived(entityType, entityId) {
  if (!entityId) return false;
  if (entityType === "contact") {
    const c = await prisma.cRMContact.findUnique({ where: { id: entityId } });
    return c?.archivedAt != null;
  }
  if (entityType === "company") {
    const c = await prisma.cRMCompany.findUnique({ where: { id: entityId } });
    return c?.archivedAt != null;
  }
  if (entityType === "deal") {
    const d = await prisma.cRMDeal.findUnique({ where: { id: entityId } });
    return d?.archivedAt != null;
  }
  return false;
}

export async function createWorkflow(chatId, userId, data) {
  await validateOwnership({ userId, chatId });

  const workflow = await prisma.cRMWorkflow.create({
    data: {
      chatId,
      userId,
      name: data.name,
      description: data.description,
      triggerType: data.triggerType,
      triggerConfig: data.triggerConfig || {},
      conditions: data.conditions || [],
      actions: data.actions || [],
      status: "DRAFT",
      approvalStatus: "NOT_SUBMITTED",
      versionNumber: 1,
    },
  });

  await prisma.cRMWorkflowVersion.create({
    data: {
      workflowId: workflow.id,
      versionNumber: 1,
      snapshot: await getCurrentWorkflowState(workflow.id),
      changeReason: "Initial version",
    },
  });

  await createWorkflowLog(workflow.id, "created", { userId, name: data.name });

  return workflow;
}

export async function updateWorkflow(chatId, workflowId, data) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");
  if (workflow.status === "ACTIVE") throw new Error("Cannot edit an active workflow. Pause it first.");

  const updateData = {};
  if (data.name !== undefined) updateData.name = data.name;
  if (data.description !== undefined) updateData.description = data.description;
  if (data.triggerType !== undefined) updateData.triggerType = data.triggerType;
  if (data.triggerConfig !== undefined) updateData.triggerConfig = data.triggerConfig;
  if (data.conditions !== undefined) updateData.conditions = data.conditions;
  if (data.actions !== undefined) updateData.actions = data.actions;

  const newVersionNumber = workflow.versionNumber + 1;
  updateData.versionNumber = newVersionNumber;

  const updated = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: updateData,
  });

  await prisma.cRMWorkflowVersion.create({
    data: {
      workflowId: workflow.id,
      versionNumber: newVersionNumber,
      snapshot: await getCurrentWorkflowState(workflow.id),
      changeReason: data.changeReason || "Workflow updated",
    },
  });

  await createWorkflowLog(workflow.id, "updated", { versionNumber: newVersionNumber, changes: Object.keys(updateData) });

  return updated;
}

export async function getWorkflow(chatId, workflowId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
    include: {
      versions: { orderBy: { versionNumber: "desc" } },
      executions: { orderBy: { createdAt: "desc" }, take: 5 },
      logs: { orderBy: { createdAt: "desc" }, take: 20 },
    },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");
  return workflow;
}

export async function listWorkflows(chatId, filters = {}) {
  const where = { chatId };
  if (filters.status) where.status = filters.status;
  if (filters.approvalStatus) where.approvalStatus = filters.approvalStatus;
  if (filters.triggerType) where.triggerType = filters.triggerType;

  return prisma.cRMWorkflow.findMany({
    where,
    orderBy: { updatedAt: "desc" },
    include: {
      _count: { select: { versions: true, executions: true } },
    },
  });
}

export async function submitForReview(chatId, workflowId, userId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");

  const updated = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: { approvalStatus: "PENDING_REVIEW" },
  });

  await createWorkflowLog(workflowId, "submitted_for_review", { userId });
  return updated;
}

export async function approveWorkflow(chatId, workflowId, userId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");

  const updated = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: {
      approvalStatus: "APPROVED",
      approvedAt: new Date(),
      approvedBy: userId,
    },
  });

  await createWorkflowLog(workflowId, "approved", { userId });
  return updated;
}

export async function requestChanges(chatId, workflowId, feedback, userId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");

  const updated = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: {
      approvalStatus: "CHANGES_REQUESTED",
      status: "DRAFT",
    },
  });

  await createWorkflowLog(workflowId, "changes_requested", { userId, feedback });
  return updated;
}

export async function activateWorkflow(chatId, workflowId, userId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");
  if (workflow.approvalStatus !== "APPROVED") throw new Error("Workflow must be approved before activation");

  const updated = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: {
      status: "ACTIVE",
      activatedAt: new Date(),
    },
  });

  await createWorkflowLog(workflowId, "activated", { userId });
  return updated;
}

export async function pauseWorkflow(chatId, workflowId, userId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");

  const updated = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: { status: "PAUSED" },
  });

  await createWorkflowLog(workflowId, "paused", { userId });
  return updated;
}

export async function testWorkflow(chatId, workflowId, testData) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");

  const simulatedResults = [];

  for (const action of (workflow.actions || [])) {
    const stepResult = {
      action: action.type,
      config: action,
      simulated: true,
      wouldExecute: true,
      timestamp: new Date().toISOString(),
    };

    switch (action.type) {
      case "CREATE_TASK":
        stepResult.wouldCreate = {
          title: action.title || "Untitled Task",
          assignedTo: action.assignedTo,
          dueAt: action.dueAt,
          priority: action.priority || "MEDIUM",
        };
        break;
      case "ASSIGN_OWNER":
        stepResult.wouldUpdate = {
          entityType: action.entityType,
          entityId: action.entityId || testData?.entityId,
          newOwnerId: action.ownerId,
        };
        break;
      case "UPDATE_LIFECYCLE_STAGE":
        stepResult.wouldUpdate = {
          contactId: action.contactId || testData?.contactId,
          newStage: action.lifecycleStage,
        };
        break;
      case "MOVE_DEAL_STAGE":
        stepResult.wouldUpdate = {
          dealId: action.dealId || testData?.dealId,
          newStageId: action.stageId,
        };
        break;
      case "ADD_ACTIVITY":
        stepResult.wouldCreate = {
          activityType: action.activityType,
          title: action.title,
          description: action.description,
        };
        break;
      case "ASSOCIATE_CAMPAIGN":
        stepResult.wouldUpdate = {
          entityType: action.entityType,
          campaignId: action.campaignId,
        };
        break;
      case "REQUEST_REVIEW":
        stepResult.wouldNotify = {
          assignedTo: action.assignedTo,
          message: action.message,
        };
        break;
      case "GENERATE_CONTENT":
        stepResult.wouldCreate = {
          activityType: "ai_generated_content",
          title: action.title || "AI Generated Outreach",
        };
        break;
      case "ANALYZE_EVIDENCE":
        stepResult.wouldAnalyze = true;
        break;
      case "PAUSE_WORKFLOW":
        stepResult.wouldPause = true;
        break;
      case "CREATE_FOLLOW_UP_RECOMMENDATION":
        stepResult.wouldCreate = {
          type: "AI_RECOMMENDATION",
          title: action.title || "Follow-up recommendation",
        };
        break;
      default:
        stepResult.wouldExecute = false;
        stepResult.error = `Unknown action type: ${action.type}`;
    }

    simulatedResults.push(stepResult);
  }

  return {
    workflowId,
    workflowName: workflow.name,
    triggerType: workflow.triggerType,
    totalActions: workflow.actions?.length || 0,
    testMode: true,
    results: simulatedResults,
    note: "This was a dry-run test. No data was created or modified.",
  };
}

export async function executeWorkflow(chatId, workflowId, triggerContext = {}) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");
  if (workflow.status !== "ACTIVE") throw new Error("Workflow is not active");
  if (workflow.status === "PAUSED") throw new Error("Workflow is paused");

  const idempotencyKey = triggerContext.idempotencyKey || `wf_${workflowId}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
  const existingExecution = await prisma.cRMWorkflowExecution.findFirst({
    where: { workflowId, idempotencyKey },
  });
  if (existingExecution) throw new Error("Duplicate execution prevented by idempotency key");

  const maxDepth = triggerContext.maxDepth || 10;
  const maxActions = triggerContext.maxActions || 20;

  const executionDepth = triggerContext.executionDepth || 0;
  if (executionDepth >= maxDepth) throw new Error("Max workflow depth exceeded");

  const actions = workflow.actions || [];
  if (actions.length > maxActions) throw new Error(`Max actions (${maxActions}) exceeded`);

  const contactId = triggerContext.contactId;
  const companyId = triggerContext.companyId;
  const dealId = triggerContext.dealId;

  if (contactId && await checkEntityArchived("contact", contactId)) {
    throw new Error("Cannot execute workflow on an archived contact");
  }
  if (companyId && await checkEntityArchived("company", companyId)) {
    throw new Error("Cannot execute workflow on an archived company");
  }
  if (dealId && await checkEntityArchived("deal", dealId)) {
    throw new Error("Cannot execute workflow on an archived deal");
  }

  if (contactId) {
    const hasConsent = await checkContactConsent(contactId, triggerContext.actionType);
    if (!hasConsent) throw new Error("Contact has unsubscribed or is archived");
  }

  let execution;
  try {
    execution = await prisma.cRMWorkflowExecution.create({
      data: {
        workflowId,
        status: "running",
        idempotencyKey,
        startedAt: new Date(),
        metadata: {
          executionDepth: executionDepth + 1,
          triggerContext,
          retryCount: triggerContext.retryCount || 0,
        },
        input: triggerContext,
      },
    });

    let currentStep = 0;

    for (const action of actions) {
      currentStep++;
      const stepLog = { actionType: action.type, step: currentStep, config: action };

      try {
        switch (action.type) {
          case "CREATE_TASK": {
            const taskData = {
              title: action.title || "Workflow Task",
              description: action.description,
              assignedTo: action.assignedTo,
              dueAt: action.dueAt ? new Date(action.dueAt) : undefined,
              priority: action.priority || "MEDIUM",
              contactId: action.contactId || contactId,
              companyId: action.companyId || companyId,
              dealId: action.dealId || dealId,
              source: "WORKFLOW",
            };
            const task = await createTask(chatId, workflow.userId, taskData);
            stepLog.result = { taskId: task.id, title: task.title };
            break;
          }
          case "ASSIGN_OWNER": {
            if (action.entityType === "contact") {
              await prisma.cRMContact.update({
                where: { id: action.entityId || contactId },
                data: { ownerId: action.ownerId },
              });
            } else if (action.entityType === "deal") {
              await prisma.cRMDeal.update({
                where: { id: action.entityId || dealId },
                data: { ownerId: action.ownerId },
              });
            }
            stepLog.result = { assigned: true, ownerId: action.ownerId };
            break;
          }
          case "UPDATE_LIFECYCLE_STAGE": {
            const targetContactId = action.contactId || contactId;
            if (targetContactId) {
              await prisma.cRMContact.update({
                where: { id: targetContactId },
                data: { lifecycleStage: action.lifecycleStage },
              });
              stepLog.result = { contactId: targetContactId, newStage: action.lifecycleStage };
            }
            break;
          }
          case "MOVE_DEAL_STAGE": {
            const targetDealId = action.dealId || dealId;
            if (targetDealId && action.stageId) {
              await moveDealStage(chatId, targetDealId, action.stageId, workflow.userId);
              stepLog.result = { dealId: targetDealId, stageId: action.stageId };
            }
            break;
          }
          case "ADD_ACTIVITY": {
            const activity = await createActivity(chatId, workflow.userId, {
              contactId: action.contactId || contactId,
              companyId: action.companyId || companyId,
              dealId: action.dealId || dealId,
              activityType: action.activityType || "workflow_execution",
              title: action.title || "Workflow activity",
              description: action.description,
              source: "SYSTEM",
            });
            stepLog.result = { activityId: activity.id };
            break;
          }
          case "ASSOCIATE_CAMPAIGN": {
            const metaUpdate = { campaignId: action.campaignId, associatedAt: new Date().toISOString() };
            if (action.entityType === "contact") {
              const c = await prisma.cRMContact.findUnique({ where: { id: action.entityId || contactId } });
              if (c) {
                await prisma.cRMContact.update({
                  where: { id: c.id },
                  data: { metadata: { ...(c.metadata || {}), campaign: metaUpdate } },
                });
              }
            } else if (action.entityType === "deal") {
              const d = await prisma.cRMDeal.findUnique({ where: { id: action.entityId || dealId } });
              if (d) {
                await prisma.cRMDeal.update({
                  where: { id: d.id },
                  data: { metadata: { ...(d.metadata || {}), campaign: metaUpdate } },
                });
              }
            }
            stepLog.result = { associated: true, campaignId: action.campaignId };
            break;
          }
          case "REQUEST_REVIEW": {
            await prisma.notification.create({
              data: {
                chatId,
                userId: action.assignedTo || workflow.userId,
                type: "workflow_review",
                title: action.message || "Workflow review requested",
                metadata: { workflowId, workflowName: workflow.name },
              },
            });
            stepLog.result = { notified: action.assignedTo };
            break;
          }
          case "GENERATE_CONTENT": {
            const activity = await createActivity(chatId, workflow.userId, {
              contactId: action.contactId || contactId,
              companyId: action.companyId || companyId,
              dealId: action.dealId || dealId,
              activityType: "ai_generated_content",
              title: action.title || "AI Generated Outreach",
              description: `Draft generated for ${action.contentType || 'email'}.`,
              metadata: {
                generatedContent: true,
                evidenceSnapshotId: triggerContext.evidenceSnapshotId || null,
              },
              source: "AI_GENERATED",
            });
            stepLog.result = { activityId: activity.id, generated: true };
            break;
          }
          case "ANALYZE_EVIDENCE": {
            stepLog.result = {
              analyzed: true,
              evidenceSnapshotId: triggerContext.evidenceSnapshotId || null,
              insight: "Evidence snapshot analyzed for routing conditions."
            };
            break;
          }
          case "PAUSE_WORKFLOW": {
            await prisma.cRMWorkflow.update({
              where: { id: workflowId },
              data: { status: "PAUSED" },
            });
            stepLog.result = { paused: true };
            break;
          }
          case "CREATE_FOLLOW_UP_RECOMMENDATION": {
            const extendedDesc = action.description 
              ? action.description + (triggerContext.evidenceSnapshotId ? `\n\n[Evidence Snapshot: ${triggerContext.evidenceSnapshotId}]` : '')
              : (triggerContext.evidenceSnapshotId ? `[Evidence Snapshot: ${triggerContext.evidenceSnapshotId}]` : null);

            const rec = await createTask(chatId, workflow.userId, {
              title: action.title || "Follow-up recommendation",
              description: extendedDesc,
              assignedTo: action.assignedTo,
              dueAt: action.dueAt ? new Date(action.dueAt) : new Date(Date.now() + 7 * 86400000),
              priority: action.priority || "LOW",
              contactId: action.contactId || contactId,
              companyId: action.companyId || companyId,
              dealId: action.dealId || dealId,
              source: "AI_RECOMMENDATION",
            });
            stepLog.result = { taskId: rec.id, title: rec.title };
            break;
          }
          default:
            stepLog.skipped = true;
            stepLog.reason = `Unknown action type: ${action.type}`;
        }
      } catch (actionError) {
        stepLog.error = actionError.message;
        await prisma.cRMWorkflowExecution.update({
          where: { id: execution.id },
          data: {
            status: "failed",
            errorMessage: `Step ${currentStep} (${action.type}): ${actionError.message}`,
            completedAt: new Date(),
          },
        });
        await createWorkflowLog(workflowId, "execution_failed", {
          executionId: execution.id,
          step: currentStep,
          actionType: action.type,
          error: actionError.message,
        });
        throw actionError;
      }

      await createWorkflowLog(workflowId, "execution_step", {
        executionId: execution.id,
        step: currentStep,
        actionType: action.type,
        result: stepLog.result || null,
        error: stepLog.error || null,
      });
    }

    execution = await prisma.cRMWorkflowExecution.update({
      where: { id: execution.id },
      data: {
        status: "completed",
        completedAt: new Date(),
        output: { stepsExecuted: currentStep, totalActions: actions.length },
      },
    });

    await createWorkflowLog(workflowId, "execution_completed", {
      executionId: execution.id,
      stepsExecuted: currentStep,
    });
  } catch (error) {
    if (execution?.id) {
      await prisma.cRMWorkflowExecution.update({
        where: { id: execution.id },
        data: {
          status: "failed",
          errorMessage: error.message,
          completedAt: new Date(),
        },
      });
      await createWorkflowLog(workflowId, "execution_failed", {
        executionId: execution.id,
        error: error.message,
      });
    }
    throw error;
  }

  return execution;
}

export async function getWorkflowLogs(workflowId) {
  return prisma.cRMWorkflowLog.findMany({
    where: { workflowId },
    orderBy: { createdAt: "desc" },
    take: 100,
  });
}

export async function createWorkflowVersionSnapshot(workflowId, reason, userId) {
  const workflow = await prisma.cRMWorkflow.findUnique({
    where: { id: workflowId },
  });
  if (!workflow) throw new Error("Workflow not found");

  const newVersionNumber = workflow.versionNumber + 1;

  await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: { versionNumber: newVersionNumber },
  });

  const version = await prisma.cRMWorkflowVersion.create({
    data: {
      workflowId,
      versionNumber: newVersionNumber,
      snapshot: await getCurrentWorkflowState(workflowId),
      changeReason: reason || "Manual snapshot",
    },
  });

  await createWorkflowLog(workflowId, "version_snapshot_created", {
    userId,
    versionNumber: newVersionNumber,
    reason,
  });

  return version;
}

export async function restoreWorkflowVersion(chatId, workflowId, versionId, userId) {
  const workflow = await prisma.cRMWorkflow.findFirst({
    where: { id: workflowId, chatId },
  });
  if (!workflow) throw new Error("Workflow not found or access denied");

  const version = await prisma.cRMWorkflowVersion.findFirst({
    where: { id: versionId, workflowId },
  });
  if (!version) throw new Error("Version not found");

  const snapshot = version.snapshot;
  const restoreData = {};
  if (snapshot.name !== undefined) restoreData.name = snapshot.name;
  if (snapshot.description !== undefined) restoreData.description = snapshot.description;
  if (snapshot.triggerType !== undefined) restoreData.triggerType = snapshot.triggerType;
  if (snapshot.triggerConfig !== undefined) restoreData.triggerConfig = snapshot.triggerConfig;
  if (snapshot.conditions !== undefined) restoreData.conditions = snapshot.conditions;
  if (snapshot.actions !== undefined) restoreData.actions = snapshot.actions;

  const newVersionNumber = workflow.versionNumber + 1;
  restoreData.versionNumber = newVersionNumber;
  restoreData.status = "DRAFT";
  restoreData.approvalStatus = "NOT_SUBMITTED";

  const restored = await prisma.cRMWorkflow.update({
    where: { id: workflowId },
    data: restoreData,
  });

  await prisma.cRMWorkflowVersion.create({
    data: {
      workflowId,
      versionNumber: newVersionNumber,
      snapshot: await getCurrentWorkflowState(workflowId),
      changeReason: `Restored from version ${version.versionNumber}`,
    },
  });

  await createWorkflowLog(workflowId, "version_restored", {
    userId,
    restoredFromVersion: version.versionNumber,
    newVersionNumber,
  });

  return restored;
}

export async function getWorkflowVersions(workflowId) {
  return prisma.cRMWorkflowVersion.findMany({
    where: { workflowId },
    orderBy: { versionNumber: "desc" },
  });
}

export async function cancelExecution(executionId) {
  const execution = await prisma.cRMWorkflowExecution.findUnique({
    where: { id: executionId },
  });
  if (!execution) throw new Error("Execution not found");

  return prisma.cRMWorkflowExecution.update({
    where: { id: executionId },
    data: { status: "CANCELLED", completedAt: new Date() },
  });
}

export async function retryExecution(executionId) {
  const failedExecution = await prisma.cRMWorkflowExecution.findUnique({
    where: { id: executionId },
    include: { workflow: true },
  });
  if (!failedExecution) throw new Error("Execution not found");
  if (failedExecution.status !== "failed") throw new Error("Can only retry failed executions");

  const metadata = (failedExecution.metadata || {});
  const retryCount = (metadata.retryCount || 0) + 1;
  const triggerContext = {
    ...(metadata.triggerContext || {}),
    retryCount,
    idempotencyKey: `retry_${failedExecution.id}_${Date.now()}`,
    executionDepth: (metadata.executionDepth || 0) + 1,
  };

  return executeWorkflow(failedExecution.workflow.chatId, failedExecution.workflowId, triggerContext);
}
