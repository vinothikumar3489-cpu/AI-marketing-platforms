import { Router } from "express";
import { requireAuth } from "../../../middleware/auth.middleware.js";
import {
  handleCreateContact, handleUpdateContact, handleArchiveContact,
  handleGetContact, handleListContacts,
} from "../controllers/crm-contact.controller.js";
import {
  handleCreateCompany, handleUpdateCompany, handleArchiveCompany,
  handleGetCompany, handleListCompany,
} from "../controllers/crm-company.controller.js";
import {
  handleCreateDeal, handleUpdateDeal, handleArchiveDeal,
  handleGetDeal, handleListDeals, handleMoveDealStage,
} from "../controllers/crm-deal.controller.js";
import {
  handleCreatePipeline, handleRenamePipeline, handleArchivePipeline,
  handleGetPipeline, handleListPipelines,
  handleCreateStage, handleRenameStage, handleReorderStages, handleArchiveStage,
  handleGetDefaultPipeline,
} from "../controllers/crm-pipeline.controller.js";
import {
  handleCreateTask, handleUpdateTask, handleCompleteTask,
  handleCancelTask, handleAssignTask, handleListTasks,
} from "../controllers/crm-task.controller.js";
import {
  handleCreateActivity, handleListActivities, handleGetRecentActivities,
} from "../controllers/crm-activity.controller.js";
import {
  handleCreateWorkflow, handleUpdateWorkflow, handleGetWorkflow, handleListWorkflows,
  handleSubmitForReview, handleApproveWorkflow, handleRequestChanges,
  handleActivateWorkflow, handlePauseWorkflow,
  handleExecuteWorkflow, handleTestWorkflow,
  handleGetWorkflowLogs, handleGetWorkflowVersions, handleRestoreWorkflowVersion,
} from "../controllers/crm-workflow.controller.js";
import {
  handleUploadCsv, handleMapColumns, handleValidateRows,
  handleConfirmImport, handleGetImportJob, handleListImportJobs,
} from "../controllers/crm-import.controller.js";
import {
  handleGenerateLeadJourney, handleGetLeadJourney,
} from "../controllers/crm-lead-journey.controller.js";

export const crmRouter = Router();

crmRouter.use(requireAuth);

// === CRM Dashboard / Context ===
crmRouter.get("/:chatId/crm/dashboard", async (req, res) => {
  const { loadCRMContext } = await import("../services/automation/crm-data.service.js");
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const context = await loadCRMContext(chatId, userId);
    res.json({ success: true, data: context });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
});

// === Contacts ===
crmRouter.post("/:chatId/crm/contacts", handleCreateContact);
crmRouter.get("/:chatId/crm/contacts", handleListContacts);
crmRouter.get("/:chatId/crm/contacts/:contactId", handleGetContact);
crmRouter.patch("/:chatId/crm/contacts/:contactId", handleUpdateContact);
crmRouter.delete("/:chatId/crm/contacts/:contactId", handleArchiveContact);

// === Companies ===
crmRouter.post("/:chatId/crm/companies", handleCreateCompany);
crmRouter.get("/:chatId/crm/companies", handleListCompany);
crmRouter.get("/:chatId/crm/companies/:companyId", handleGetCompany);
crmRouter.patch("/:chatId/crm/companies/:companyId", handleUpdateCompany);
crmRouter.delete("/:chatId/crm/companies/:companyId", handleArchiveCompany);

// === Deals ===
crmRouter.post("/:chatId/crm/deals", handleCreateDeal);
crmRouter.get("/:chatId/crm/deals", handleListDeals);
crmRouter.get("/:chatId/crm/deals/:dealId", handleGetDeal);
crmRouter.patch("/:chatId/crm/deals/:dealId", handleUpdateDeal);
crmRouter.delete("/:chatId/crm/deals/:dealId", handleArchiveDeal);
crmRouter.post("/:chatId/crm/deals/:dealId/move-stage", handleMoveDealStage);

// === Pipelines ===
crmRouter.get("/:chatId/crm/pipelines/default", handleGetDefaultPipeline);
crmRouter.post("/:chatId/crm/pipelines", handleCreatePipeline);
crmRouter.get("/:chatId/crm/pipelines", handleListPipelines);
crmRouter.get("/:chatId/crm/pipelines/:pipelineId", handleGetPipeline);
crmRouter.patch("/:chatId/crm/pipelines/:pipelineId", handleRenamePipeline);
crmRouter.delete("/:chatId/crm/pipelines/:pipelineId", handleArchivePipeline);
crmRouter.post("/:chatId/crm/pipelines/:pipelineId/stages", handleCreateStage);
crmRouter.patch("/:chatId/crm/pipelines/:pipelineId/stages/:stageId", handleRenameStage);
crmRouter.delete("/:chatId/crm/pipelines/:pipelineId/stages/:stageId", handleArchiveStage);
crmRouter.post("/:chatId/crm/pipelines/:pipelineId/reorder-stages", handleReorderStages);

// === Tasks ===
crmRouter.post("/:chatId/crm/tasks", handleCreateTask);
crmRouter.get("/:chatId/crm/tasks", handleListTasks);
crmRouter.patch("/:chatId/crm/tasks/:taskId", handleUpdateTask);
crmRouter.post("/:chatId/crm/tasks/:taskId/complete", handleCompleteTask);
crmRouter.post("/:chatId/crm/tasks/:taskId/cancel", handleCancelTask);
crmRouter.post("/:chatId/crm/tasks/:taskId/assign", handleAssignTask);

// === Activities ===
crmRouter.post("/:chatId/crm/activities", handleCreateActivity);
crmRouter.get("/:chatId/crm/activities", handleListActivities);
crmRouter.get("/:chatId/crm/activities/recent", handleGetRecentActivities);

// === Lead Journey ===
crmRouter.post("/:chatId/crm/lead-journey/:contactId/generate", handleGenerateLeadJourney);
crmRouter.get("/:chatId/crm/lead-journey/:contactId", handleGetLeadJourney);

// === Workflows ===
crmRouter.post("/:chatId/crm/workflows", handleCreateWorkflow);
crmRouter.get("/:chatId/crm/workflows", handleListWorkflows);
crmRouter.get("/:chatId/crm/workflows/:workflowId", handleGetWorkflow);
crmRouter.patch("/:chatId/crm/workflows/:workflowId", handleUpdateWorkflow);
crmRouter.post("/:chatId/crm/workflows/:workflowId/submit-review", handleSubmitForReview);
crmRouter.post("/:chatId/crm/workflows/:workflowId/approve", handleApproveWorkflow);
crmRouter.post("/:chatId/crm/workflows/:workflowId/request-changes", handleRequestChanges);
crmRouter.post("/:chatId/crm/workflows/:workflowId/activate", handleActivateWorkflow);
crmRouter.post("/:chatId/crm/workflows/:workflowId/pause", handlePauseWorkflow);
crmRouter.post("/:chatId/crm/workflows/:workflowId/test", handleTestWorkflow);
crmRouter.post("/:chatId/crm/workflows/:workflowId/run", handleExecuteWorkflow);
crmRouter.get("/:chatId/crm/workflows/:workflowId/logs", handleGetWorkflowLogs);
crmRouter.get("/:chatId/crm/workflows/:workflowId/versions", handleGetWorkflowVersions);
crmRouter.post("/:chatId/crm/workflows/:workflowId/restore/:versionId", handleRestoreWorkflowVersion);

// === Import ===
crmRouter.post("/:chatId/crm/import/upload", handleUploadCsv);
crmRouter.post("/:chatId/crm/import/:importId/map", handleMapColumns);
crmRouter.post("/:chatId/crm/import/:importId/validate", handleValidateRows);
crmRouter.post("/:chatId/crm/import/:importId/confirm", handleConfirmImport);
crmRouter.get("/:chatId/crm/import/:importId", handleGetImportJob);
crmRouter.get("/:chatId/crm/import/jobs", handleListImportJobs);
