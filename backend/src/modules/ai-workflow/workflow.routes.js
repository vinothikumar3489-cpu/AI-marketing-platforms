import express from 'express';
import { requireAuth } from '../../middleware/auth.middleware.js';
import {
  generateSolutionHandler,
  getSolutionHandler,
  getSolutionStatusHandler,
  startWorkflowHandler,
  getWorkflowStatusHandler,
  executeWorkflowStepHandler,
} from './workflow.controller.js';

export const workflowRouter = express.Router();

// All routes require authentication
workflowRouter.use(requireAuth);

// === Existing routes (preserved) ===

// Get solution generation status (module readiness)
workflowRouter.get('/:chatId/solution-status', getSolutionStatusHandler);

// Get saved solution
workflowRouter.get('/:chatId/solution', getSolutionHandler);

// Generate complete marketing solution
workflowRouter.post('/:chatId/generate-solution', generateSolutionHandler);

// === New workflow engine routes ===

// Start full workflow (runs all steps sequentially)
workflowRouter.post('/:chatId/workflow/start', startWorkflowHandler);

// Get current workflow status (all steps so far)
workflowRouter.get('/:chatId/workflow/status', getWorkflowStatusHandler);

// Execute a single workflow step
workflowRouter.post('/:chatId/workflow/step', executeWorkflowStepHandler);
