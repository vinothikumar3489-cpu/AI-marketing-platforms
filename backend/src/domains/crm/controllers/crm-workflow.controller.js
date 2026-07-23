import {
  createWorkflow,
  updateWorkflow,
  getWorkflow,
  listWorkflows,
  submitForReview,
  approveWorkflow,
  requestChanges,
  activateWorkflow,
  pauseWorkflow,
  executeWorkflow,
  testWorkflow,
  getWorkflowLogs,
  getWorkflowVersions,
  restoreWorkflowVersion,
} from "../../../services/automation/crm-workflow.service.js";
import { getCrmQueue } from "../../../jobs/queues.js";

export async function handleCreateWorkflow(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user?.id;
    const data = req.body;

    if (!chatId) {
      return res.status(400).json({ success: false, error: "chatId is required" });
    }

    const result = await createWorkflow(chatId, userId, data);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleUpdateWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;
    const updates = req.body;

    const result = await updateWorkflow(chatId, workflowId, userId, updates);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;

    const result = await getWorkflow(chatId, workflowId);
    if (!result) {
      return res.status(404).json({ success: false, error: "Workflow not found" });
    }
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleListWorkflows(req, res) {
  try {
    const { chatId } = req.params;
    const query = req.query;

    const result = await listWorkflows(chatId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleSubmitForReview(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;

    const result = await submitForReview(chatId, workflowId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleApproveWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;

    const result = await approveWorkflow(chatId, workflowId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleRequestChanges(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;
    const { feedback } = req.body;

    if (!feedback) {
      return res.status(400).json({ success: false, error: "feedback is required" });
    }

    const result = await requestChanges(chatId, workflowId, userId, feedback);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleActivateWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;

    const result = await activateWorkflow(chatId, workflowId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handlePauseWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;

    const result = await pauseWorkflow(chatId, workflowId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleExecuteWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;
    const context = req.body || {};
    context.userId = userId;

    const queue = getCrmQueue();
    if (queue && process.env.REDIS_URL) {
      try {
        const job = await queue.add('execute-workflow', { chatId, workflowId, triggerContext: context });
        console.log('[CRM WORKFLOW QUEUED]', { jobId: job.id, workflowId });
        return res.json({ success: true, data: { jobId: job.id, message: "Workflow execution queued" } });
      } catch (queueErr) {
        console.warn('[CRM WORKFLOW QUEUE FAILED] falling back to sync:', queueErr.message);
      }
    } else {
      console.log('[CRM WORKFLOW SYNC MODE] Redis unavailable, executing synchronously');
    }

    const result = await executeWorkflow(chatId, workflowId, context);
    res.json({ success: true, data: { result, message: "Workflow executed synchronously" } });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleTestWorkflow(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const userId = req.user?.id;
    const testData = req.body;

    const result = await testWorkflow(chatId, workflowId, userId, testData);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetWorkflowLogs(req, res) {
  try {
    const { chatId, workflowId } = req.params;
    const query = req.query;

    const result = await getWorkflowLogs(chatId, workflowId, query);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleGetWorkflowVersions(req, res) {
  try {
    const { chatId, workflowId } = req.params;

    const result = await getWorkflowVersions(chatId, workflowId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}

export async function handleRestoreWorkflowVersion(req, res) {
  try {
    const { chatId, workflowId, versionId } = req.params;
    const userId = req.user?.id;

    const result = await restoreWorkflowVersion(chatId, workflowId, versionId, userId);
    res.json({ success: true, data: result });
  } catch (err) {
    res.status(400).json({ success: false, error: err.message });
  }
}
