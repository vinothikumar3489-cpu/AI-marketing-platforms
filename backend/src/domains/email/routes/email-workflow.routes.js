import express from "express";
import { requireAuth } from "../../../middleware/auth.middleware.js";
import {
  generateEmail,
  validateEmailContent,
  saveDraft,
  updateTemplate,
  approveTemplate,
  rejectTemplate,
  getTemplate,
  listTemplates,
  deleteTemplate,
  sendTestEmailHandler,
  sendEmailNow,
  scheduleEmailHandler,
  cancelScheduledEmailHandler,
  getDeliveryStatusHandler,
  generateHtml,
  generatePlainText
} from "../controllers/email-workflow.controller.js";

export const emailWorkflowRouter = express.Router();

// Log all incoming requests to this router
emailWorkflowRouter.use((req, res, next) => {
  const rid = req.requestId || 'NO_RID';
  const bodyPreview = req.method === 'POST' && req.body ? JSON.stringify(req.body).substring(0, 200) : '';
  console.log(`[${rid}] [EMAIL-ROUTE] ${req.method} ${req.originalUrl} — matched emailWorkflowRouter${bodyPreview ? ' — body: ' + bodyPreview : ''}`);
  next();
});

emailWorkflowRouter.use(requireAuth);

// Email generation and validation
emailWorkflowRouter.post("/:chatId/generate", generateEmail);
emailWorkflowRouter.post("/validate", validateEmailContent);

// Email template CRUD
emailWorkflowRouter.post("/:chatId/draft", saveDraft);
emailWorkflowRouter.put("/templates/:templateId", updateTemplate);
emailWorkflowRouter.get("/templates/:templateId", getTemplate);
emailWorkflowRouter.get("/:chatId/templates", listTemplates);
emailWorkflowRouter.delete("/templates/:templateId", deleteTemplate);

// Email approval workflow
emailWorkflowRouter.post("/templates/:templateId/approve", approveTemplate);
emailWorkflowRouter.post("/templates/:templateId/reject", rejectTemplate);

// Email sending
emailWorkflowRouter.post("/:chatId/send-test", sendTestEmailHandler);
emailWorkflowRouter.post("/:chatId/send-now", sendEmailNow);
emailWorkflowRouter.post("/:chatId/schedule", scheduleEmailHandler);
emailWorkflowRouter.delete("/scheduled/:scheduledId", cancelScheduledEmailHandler);

// Delivery status
emailWorkflowRouter.get("/templates/:templateId/delivery-status", getDeliveryStatusHandler);

// Content generation helpers
emailWorkflowRouter.post("/generate-html", generateHtml);
emailWorkflowRouter.post("/generate-plain-text", generatePlainText);
