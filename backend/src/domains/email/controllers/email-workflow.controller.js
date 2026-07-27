/**
 * Email Workflow Controller
 * Handles email generation, validation, approval, sending, and scheduling
 */

import { generateEmailCopy } from "../../../services/execution/content-studio.service.js";
import { validateEmail, validateForSending } from "../../../services/email/email-validator.service.js";
import { generateEmailHtmlTemplate, generatePlainTextFromEmailData } from "../../../services/email/email-html-generator.service.js";
import { sendTransactionalEmail, sendTestEmail, scheduleEmail, cancelScheduledEmail, getDeliveryStatus as getBrevoDeliveryStatus } from '../../../services/providers/email/brevo.provider.js';
import { 
  saveEmailDraft, 
  updateEmailTemplate, 
  approveEmailTemplate, 
  rejectEmailTemplate, 
  getEmailTemplate, 
  listEmailTemplates,
  deleteEmailTemplate,
  saveDeliveryRecord,
  getDeliveryStatus
} from "../../../services/persistence/email-persistence.service.js";
import { replacePersonalizationVariables } from "../../../dto/email-copy.dto.js";
import prisma from "../../../config/prisma.js";

/**
 * Generate email content
 */
export async function generateEmail(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const brief = req.body;

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Add product identity from chat if available
    if (!brief.productIdentity) {
      const analysis = await prisma.analysis.findFirst({
        where: { chatId },
        orderBy: { createdAt: 'desc' }
      });
      if (analysis) {
        brief.productIdentity = {
          displayName: analysis.productName,
          internalName: analysis.productName,
          brandName: analysis.brandName,
          domain: analysis.domain
        };
      }
    }

    const emailContent = await generateEmailCopy(brief);

    if (!emailContent) {
      return res.status(500).json({ success: false, error: 'Email generation failed' });
    }

    // Validate generated content
    const validation = validateEmail(emailContent, {
      productName: brief.productIdentity?.displayName,
      audienceIntelligence: brief.targetPersonas
    });

    emailContent.quality = validation;

    return res.json({
      success: true,
      email: emailContent,
      validation
    });
  } catch (error) {
    console.error('[EmailWorkflow] Generate error:', error.message);
    return res.status(500).json({ success: false, error: 'Email generation failed', details: error.message });
  }
}

/**
 * Validate email content
 */
export async function validateEmailContent(req, res) {
  try {
    const emailData = req.body;
    const context = {
      productName: emailData.productIdentity?.displayName,
      audienceIntelligence: req.body.audienceIntelligence
    };

    const validation = validateEmail(emailData, context);

    return res.json({
      success: true,
      validation
    });
  } catch (error) {
    console.error('[EmailWorkflow] Validate error:', error.message);
    return res.status(500).json({ success: false, error: 'Email validation failed', details: error.message });
  }
}

/**
 * Save email draft
 */
export async function saveDraft(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const emailData = req.body;

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const result = await saveEmailDraft(userId, chatId, emailData);

    if (result.success) {
      return res.json(result);
    }

    return res.status(500).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Save draft error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save draft', details: error.message });
  }
}

/**
 * Update email template
 */
export async function updateTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const emailData = req.body;

    const result = await updateEmailTemplate(templateId, userId, emailData);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Update template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update template', details: error.message });
  }
}

/**
 * Approve email template
 */
export async function approveTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await approveEmailTemplate(templateId, userId);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Approve template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to approve template', details: error.message });
  }
}

/**
 * Reject email template
 */
export async function rejectTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const result = await rejectEmailTemplate(templateId, userId, reason);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Reject template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reject template', details: error.message });
  }
}

/**
 * Get email template
 */
export async function getTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await getEmailTemplate(templateId, userId);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Get template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get template', details: error.message });
  }
}

/**
 * List email templates
 */
export async function listTemplates(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const filters = req.query;

    const result = await listEmailTemplates(userId, chatId, filters);

    return res.json(result);
  } catch (error) {
    console.error('[EmailWorkflow] List templates error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to list templates', details: error.message });
  }
}

/**
 * Delete email template
 */
export async function deleteTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await deleteEmailTemplate(templateId, userId);

    if (result.success) {
      return res.json(result);
    }

    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Delete template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to delete template', details: error.message });
  }
}

/**
 * Send test email
 */
export async function sendTestEmailHandler(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, senderOverride } = req.body;

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get template
    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const template = templateResult.template;

    // Check if template is approved
    if (template.approvalStatus !== 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Template must be approved before sending' });
    }

    // Validate for sending
    const emailData = template.structuredContent || template;
    const validation = validateForSending(emailData);

    if (!validation.canSend) {
      return res.status(400).json({ success: false, error: 'Email validation failed', blockingIssues: validation.blockingIssues });
    }

    // Apply personalization
    const personalizedHtml = replacePersonalizationVariables(
      template.htmlContent || template.emailBodyHtml,
      template.recipients?.[0],
      template,
      template.productIdentity?.displayName
    );

    const personalizedPlainText = replacePersonalizationVariables(
      template.plainTextContent || template.emailBodyText,
      template.recipients?.[0],
      template,
      template.productIdentity?.displayName
    );

    // Send test email
    const sender = senderOverride || {
      name: template.senderName,
      email: template.senderEmail
    };

    const result = await sendTestEmail({
      to: recipientEmail,
      subject: `[TEST] ${template.subject}`,
      html: personalizedHtml,
      text: personalizedPlainText,
      senderName: sender.name,
      replyTo: template.replyToEmail,
      tags: ['TEST_EMAIL', template.emailType]
    });

    if (result.success) {
      // Log the test send
      await prisma.automationLog.create({
        data: {
          userId,
          chatId,
          action: 'email_test_sent',
          message: `Test email sent to ${result.maskedRecipient}`,
          metadata: { templateId, providerMessageId: result.providerMessageId }
        }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Send test email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send test email', details: error.message });
  }
}

/**
 * Send email now
 */
export async function sendEmailNow(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, senderOverride } = req.body;

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get template
    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const template = templateResult.template;

    // Check if template is approved
    if (template.approvalStatus !== 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Template must be approved before sending' });
    }

    // Validate for sending
    const emailData = template.structuredContent || template;
    const validation = validateForSending(emailData);

    if (!validation.canSend) {
      return res.status(400).json({ success: false, error: 'Email validation failed', blockingIssues: validation.blockingIssues });
    }

    let recipient = template.recipients?.[0] || { email: recipientEmail, id: 'temp-recipient' };

    // Apply personalization
    const personalizedHtml = replacePersonalizationVariables(
      template.htmlContent || template.emailBodyHtml,
      recipient,
      template,
      template.productIdentity?.displayName
    );

    const personalizedPlainText = replacePersonalizationVariables(
      template.plainTextContent || template.emailBodyText,
      recipient,
      template,
      template.productIdentity?.displayName
    );

    // Send email
    const sender = senderOverride || {
      name: template.senderName,
      email: template.senderEmail
    };

    const result = await sendTransactionalEmail({
      to: recipientEmail,
      subject: template.subject,
      html: personalizedHtml,
      text: personalizedPlainText,
      senderName: sender.name,
      replyTo: template.replyToEmail,
      tags: [template.emailType, template.approvalStatus],
      metadata: { templateId, recipientId: recipient.id }
    });

    if (result.success) {

      // Log the send
      await prisma.automationLog.create({
        data: {
          userId,
          chatId,
          action: 'email_sent',
          message: `Email sent to ${result.maskedRecipient}`,
          metadata: { templateId, providerMessageId: result.providerMessageId }
        }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Send email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send email', details: error.message });
  }
}

/**
 * Schedule email
 */
export async function scheduleEmailHandler(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, scheduledAt, senderOverride } = req.body;

    // Verify chat ownership
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    // Get template
    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) {
      return res.status(404).json({ success: false, error: 'Template not found' });
    }

    const template = templateResult.template;

    // Check if template is approved
    if (template.approvalStatus !== 'APPROVED') {
      return res.status(400).json({ success: false, error: 'Template must be approved before scheduling' });
    }

    // Validate for sending
    const emailData = template.structuredContent || template;
    const validation = validateForSending(emailData);

    if (!validation.canSend) {
      return res.status(400).json({ success: false, error: 'Email validation failed', blockingIssues: validation.blockingIssues });
    }

    // Ensure recipient exists
    let recipient = template.recipients[0];
    if (!recipient || recipient.email !== recipientEmail) {
      recipient = await prisma.emailRecipient.upsert({
        where: { id: recipient?.id || '' },
        update: { email: recipientEmail },
        create: {
          emailTemplateId: templateId,
          email: recipientEmail
        }
      });
    }

    // Apply personalization
    const personalizedHtml = replacePersonalizationVariables(
      template.htmlContent,
      recipient,
      template,
      template.productIdentity?.displayName
    );

    const personalizedPlainText = replacePersonalizationVariables(
      template.plainTextContent,
      recipient,
      template,
      template.productIdentity?.displayName
    );

    // Schedule email
    const sender = senderOverride || {
      name: template.senderName,
      email: template.senderEmail
    };

    const result = await scheduleEmail({
      to: recipientEmail,
      subject: template.subject,
      html: personalizedHtml,
      text: personalizedPlainText,
      senderName: sender.name,
      replyTo: template.replyToEmail,
      scheduledAt,
      tags: [template.emailType, 'SCHEDULED'],
      metadata: { templateId, recipientId: recipient.id }
    });

    if (result.success) {
      // Save delivery record
      await saveDeliveryRecord(templateId, recipient.id, {
        brevoMessageId: result.scheduledId,
        status: 'SCHEDULED',
        scheduledAt
      });

      // Log the schedule
      await prisma.automationLog.create({
        data: {
          userId,
          chatId,
          action: 'email_scheduled',
          message: `Email scheduled for ${scheduledAt}`,
          metadata: { templateId, scheduledId: result.scheduledId }
        }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Schedule email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to schedule email', details: error.message });
  }
}

/**
 * Cancel scheduled email
 */
export async function cancelScheduledEmailHandler(req, res) {
  try {
    const { scheduledId } = req.params;
    const userId = req.user.id;

    // Find delivery record
    const delivery = await prisma.emailDelivery.findFirst({
      where: { brevoMessageId: scheduledId },
      include: { template: true }
    });

    if (!delivery) {
      return res.status(404).json({ success: false, error: 'Scheduled email not found' });
    }

    // Verify ownership
    if (delivery.template.userId !== userId) {
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    // Cancel with Brevo
    const result = await cancelScheduledEmail(scheduledId);

    if (result.success) {
      // Update delivery status
      await prisma.emailDelivery.update({
        where: { id: delivery.id },
        data: { status: 'CANCELLED' }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Cancel scheduled email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to cancel scheduled email', details: error.message });
  }
}

/**
 * Get delivery status
 */
export async function getDeliveryStatusHandler(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await getDeliveryStatus(templateId, userId);

    if (result.success) {
      return res.json(result);
    }

    return res.status(404).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Get delivery status error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get delivery status', details: error.message });
  }
}

/**
 * Generate HTML from email data
 */
export async function generateHtml(req, res) {
  try {
    const emailData = req.body;

    const html = generateEmailHtmlTemplate(emailData);

    return res.json({
      success: true,
      html
    });
  } catch (error) {
    console.error('[EmailWorkflow] Generate HTML error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate HTML', details: error.message });
  }
}

/**
 * Generate plain text from email data
 */
export async function generatePlainText(req, res) {
  try {
    const emailData = req.body;

    const plainText = generatePlainTextFromEmailData(emailData);

    return res.json({
      success: true,
      plainText
    });
  } catch (error) {
    console.error('[EmailWorkflow] Generate plain text error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate plain text', details: error.message });
  }
}
