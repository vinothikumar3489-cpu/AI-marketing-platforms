import { generateEmailCopy } from "../../../services/execution/content-studio.service.js";
import { validateEmail, validateForSending } from "../../../services/email/email-validator.service.js";
import { generateEmailHtmlTemplate, generatePlainTextFromEmailData } from "../../../services/email/email-html-generator.service.js";
import { sendTransactionalEmail, sendTestEmail, scheduleEmail, cancelScheduledEmail, getDeliveryStatus as getBrevoDeliveryStatus } from '../../../services/providers/email/brevo.provider.js';
import {
  saveEmailDraft, updateEmailTemplate, approveEmailTemplate,
  rejectEmailTemplate, getEmailTemplate, listEmailTemplates,
  deleteEmailTemplate, saveDeliveryRecord, getDeliveryStatus
} from "../../../services/persistence/email-persistence.service.js";
import { replacePersonalizationVariables, normalizeEmailData } from "../../../dto/email-copy.dto.js";
import { deliverEmail } from "../../../services/email/email-delivery.service.js";
import prisma from "../../../config/prisma.js";

export async function generateEmail(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const brief = req.body;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    if (!brief.productIdentity) {
      const analysis = await prisma.analysis.findFirst({
        where: { chatId }, orderBy: { createdAt: 'desc' }
      });
      if (analysis) {
        brief.productIdentity = {
          displayName: analysis.productName, internalName: analysis.productName,
          brandName: analysis.brandName, domain: analysis.domain
        };
      }
    }

    const emailContent = await generateEmailCopy(brief);
    if (!emailContent) return res.status(500).json({ success: false, error: 'Email generation failed' });

    const validation = validateEmail(emailContent, {
      productName: brief.productIdentity?.displayName,
      audienceIntelligence: brief.targetPersonas
    });

    emailContent.quality = validation;
    emailContent._qualityScore = validation.score;
    emailContent._qualityLabel = validation.score >= 87 ? 'Excellent' : validation.score >= 70 ? 'Good' : 'Needs Improvement';
    emailContent._qualityDetails = validation.checks;

    return res.json({
      success: true,
      status: 'generated',
      email: emailContent,
      validation,
      quality: { score: validation.score, checks: validation.checks, warnings: validation.warnings },
      approvalStatus: 'DRAFT'
    });
  } catch (error) {
    console.error('[EmailWorkflow] Generate error:', error.message);
    return res.status(500).json({ success: false, error: 'Email generation failed', details: error.message });
  }
}

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
      validation,
      quality: { score: validation.score, checks: validation.checks, warnings: validation.warnings },
      approvalStatus: validation.valid ? 'DRAFT' : 'DRAFT'
    });
  } catch (error) {
    console.error('[EmailWorkflow] Validate error:', error.message);
    return res.status(500).json({ success: false, error: 'Email validation failed', details: error.message });
  }
}

export async function saveDraft(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const emailData = req.body;
    console.log(`[${rid}] [Email] [saveDraft] START: chatId=${chatId}`);

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.error(`[${rid}] [Email] [saveDraft] FAILED: Chat ${chatId} not found`);
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    const result = await saveEmailDraft(userId, chatId, emailData);
    if (result.success) {
      console.log(`[${rid}] [Email] [saveDraft] SUCCESS: templateId=${result.assetId}`);
      return res.json({
        success: true,
        status: 'saved',
        assetId: result.assetId,
        template: result.template,
        approvalStatus: result.approvalStatus || 'DRAFT',
        quality: result.template?.quality || null,
        validation: result.template?.personalizationFields?.quality || null,
        draftId: result.template?.id
      });
    }
    console.error(`[${rid}] [Email] [saveDraft] FAILED: ${result.error}`);
    return res.status(500).json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [saveDraft] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [saveDraft] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to save draft', details: error.message });
  }
}

export async function updateTemplate(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const emailData = req.body;
    console.log(`[${rid}] [Email] [updateTemplate] START: templateId=${templateId}`);

    const result = await updateEmailTemplate(templateId, userId, emailData);
    if (result.success) {
      console.log(`[${rid}] [Email] [updateTemplate] SUCCESS: templateId=${templateId}`);
      return res.json({
        success: true,
        status: 'updated',
        assetId: result.assetId,
        template: result.template,
        approvalStatus: result.approvalStatus || 'DRAFT',
        quality: result.template?.quality || null
      });
    }
    console.error(`[${rid}] [Email] [updateTemplate] FAILED: ${result.error}`);
    return res.status(400).json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [updateTemplate] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [updateTemplate] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to update template', details: error.message });
  }
}

export async function approveTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const rid = req.requestId || 'NO_RID';

    console.log(`[${rid}] [Approve] STEP 1: Approve button clicked for template ${templateId}, user ${userId}`);
    const result = await approveEmailTemplate(templateId, userId);
    if (result.success) {
      console.log(`[${rid}] [Approve] STEP 2 PASS: Complete — status: APPROVED, template: ${templateId}`);
      return res.json({
        success: true,
        status: 'approved',
        approvalStatus: 'APPROVED',
        approvedAt: result.approvedAt,
        approvedBy: result.approvedBy,
        assetId: result.assetId,
        template: result.template,
        quality: result.template?.quality || null,
        message: result.message
      });
    }
    console.error(`[${rid}] [Approve] STEP 2 FAIL: ${result.error}`);
    return res.status(400).json(result);
  } catch (error) {
    console.error(`[Approve] Exception:`, error.message, error.stack);
    return res.status(500).json({ success: false, error: 'Failed to approve template', details: error.message });
  }
}

export async function rejectTemplate(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;
    console.log(`[${rid}] [Email] [rejectTemplate] START: templateId=${templateId}`);

    const result = await rejectEmailTemplate(templateId, userId, reason);
    if (result.success) {
      console.log(`[${rid}] [Email] [rejectTemplate] SUCCESS`);
      return res.json({
        success: true,
        status: 'rejected',
        approvalStatus: 'REJECTED',
        assetId: result.assetId,
        template: result.template,
        quality: result.template?.quality || null,
        message: result.message
      });
    }
    console.error(`[${rid}] [Email] [rejectTemplate] FAILED: ${result.error}`);
    return res.status(400).json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [rejectTemplate] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [rejectTemplate] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to reject template', details: error.message });
  }
}

export async function getTemplate(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    console.log(`[${rid}] [Email] [getTemplate] START: templateId=${templateId}`);

    const result = await getEmailTemplate(templateId, userId);
    if (result.success) {
      console.log(`[${rid}] [Email] [getTemplate] SUCCESS: status=${result.approvalStatus}`);
      return res.json({
        success: true,
        status: 'found',
        template: result.template,
        approvalStatus: result.approvalStatus,
        approvedAt: result.approvedAt,
        approvedBy: result.approvedBy,
        assetId: result.assetId,
        quality: result.quality,
        validation: result.validation
      });
    }
    console.error(`[${rid}] [Email] [getTemplate] FAILED: ${result.error}`);
    return res.status(404).json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [getTemplate] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [getTemplate] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to get template', details: error.message });
  }
}

export async function listTemplates(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const filters = req.query;
    console.log(`[${rid}] [Email] [listTemplates] START: chatId=${chatId}`);

    const result = await listEmailTemplates(userId, chatId, filters);
    console.log(`[${rid}] [Email] [listTemplates] SUCCESS: count=${result.count || 0}`);
    return res.json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [listTemplates] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [listTemplates] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to list templates', details: error.message });
  }
}

export async function deleteTemplate(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    console.log(`[${rid}] [Email] [deleteTemplate] START: templateId=${templateId}`);

    const result = await deleteEmailTemplate(templateId, userId);
    if (result.success) {
      console.log(`[${rid}] [Email] [deleteTemplate] SUCCESS`);
      return res.json(result);
    }
    console.error(`[${rid}] [Email] [deleteTemplate] FAILED: ${result.error}`);
    return res.status(400).json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [deleteTemplate] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [deleteTemplate] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to delete template', details: error.message });
  }
}

export async function sendTestEmailHandler(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, senderOverride } = req.body;

    console.log(`[${rid}] [Email] STEP 1: Send Test Email handler invoked`);
    console.log(`[${rid}] [Email] STEP 1 DETAILS: chatId=${chatId}, templateId=${templateId}, recipientEmail=${recipientEmail}, userId=${userId}`);

    console.log(`[${rid}] [Email] STEP 2: Verifying chatId=${chatId} for user=${userId}`);
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.error(`[${rid}] [Email] STEP 2 FAIL: Chat ${chatId} not found for user ${userId}`);
      return res.status(404).json({
        success: false, error: 'Chat not found', requestId: rid,
        _trace: { step: 2, file: 'email-workflow.controller.js', fn: 'sendTestEmailHandler', line: 253, condition: 'chat not found in DB' }
      });
    }
    console.log(`[${rid}] [Email] STEP 2 PASS: Chat verified`);

    console.log(`[${rid}] [Email] STEP 3: Loading template ${templateId}`);
    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) {
      console.error(`[${rid}] [Email] STEP 3 FAIL: Template ${templateId} not found`);
      return res.status(404).json({
        success: false, error: 'Template not found', requestId: rid,
        _trace: { step: 3, file: 'email-workflow.controller.js', fn: 'sendTestEmailHandler', line: 261, condition: 'getEmailTemplate returned !success' }
      });
    }
    console.log(`[${rid}] [Email] STEP 3 PASS: Template loaded, approvalStatus=${templateResult.approvalStatus}`);

    console.log(`[${rid}] [Email] STEP 4: Calling deliverEmail(mode=test)`);
    const deliveryResult = await deliverEmail({
      templateId, chatId, userId,
      recipientEmail,
      emailData: templateResult.template,
      mode: 'test',
      requestId: rid,
    });
    console.log(`[${rid}] [Email] STEP 5: deliverEmail returned success=${deliveryResult.success}, status=${deliveryResult.status}`);

    if (deliveryResult.success) {
      console.log(`[${rid}] [Email] STEP 5 PASS: Test sent, messageId=${deliveryResult.messageId}, provider=${deliveryResult.provider}`);
      return res.json({
        success: true,
        status: 'test_sent',
        messageId: deliveryResult.messageId,
        provider: deliveryResult.provider,
        maskedRecipient: deliveryResult.maskedRecipient || deliveryResult.recipientEmail?.replace(/.(?=.{4})/g, '*'),
        message: 'Test email sent',
        delivered: true,
        requestId: rid,
      });
    }

    console.error(`[${rid}] [Email] STEP 5 FAIL: ${deliveryResult.error}`);
    return res.status(400).json({
      success: false,
      status: 'failed',
      error: deliveryResult.error || 'Failed to send test email',
      provider: deliveryResult.provider,
      requestId: rid,
      _trace: { step: 5, file: 'email-workflow.controller.js', fn: 'sendTestEmailHandler', condition: 'deliverEmail returned !success', error: deliveryResult.error }
    });
  } catch (error) {
    console.error(`[${rid}] [Email] EXCEPTION in sendTestEmailHandler: ${error.message}`);
    console.error(`[${rid}] [Email] Stack: ${error.stack}`);
    return res.status(500).json({
      success: false, error: 'Failed to send test email', details: error.message, requestId: rid,
      _trace: { step: 'EXCEPTION', file: 'email-workflow.controller.js', fn: 'sendTestEmailHandler', line: 292, exception: error.message }
    });
  }
}

export async function sendEmailNow(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, senderOverride } = req.body;

    console.log(`[${rid}] [Email] STEP 1: Send Now handler invoked`);
    console.log(`[${rid}] [Email] STEP 1 DETAILS: chatId=${chatId}, templateId=${templateId}, recipientEmail=${recipientEmail}, userId=${userId}`);

    console.log(`[${rid}] [Email] STEP 2: Verifying chatId=${chatId} for user=${userId}`);
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.error(`[${rid}] [Email] STEP 2 FAIL: Chat ${chatId} not found`);
      return res.status(404).json({
        success: false, error: 'Chat not found', requestId: rid,
        _trace: { step: 2, file: 'email-workflow.controller.js', fn: 'sendEmailNow', line: 305, condition: 'chat not found' }
      });
    }
    console.log(`[${rid}] [Email] STEP 2 PASS: Chat verified`);

    console.log(`[${rid}] [Email] STEP 3: Loading template ${templateId}`);
    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) {
      console.error(`[${rid}] [Email] STEP 3 FAIL: Template ${templateId} not found`);
      return res.status(404).json({
        success: false, error: 'Template not found', requestId: rid,
        _trace: { step: 3, file: 'email-workflow.controller.js', fn: 'sendEmailNow', line: 313, condition: 'getEmailTemplate returned !success' }
      });
    }
    console.log(`[${rid}] [Email] STEP 3 PASS: Template loaded, approvalStatus=${templateResult.approvalStatus}`);

    console.log(`[${rid}] [Email] STEP 4: Calling deliverEmail(mode=now)`);
    const deliveryResult = await deliverEmail({
      templateId, chatId, userId,
      recipientEmail,
      emailData: templateResult.template,
      mode: 'now',
      senderOverride,
      requestId: rid,
    });
    console.log(`[${rid}] [Email] STEP 5: deliverEmail returned success=${deliveryResult.success}, status=${deliveryResult.status}`);

    if (deliveryResult.success) {
      console.log(`[${rid}] [Email] STEP 5 PASS: Sent, messageId=${deliveryResult.messageId}, provider=${deliveryResult.provider}`);
      return res.json({
        success: true,
        status: 'sent',
        messageId: deliveryResult.messageId,
        provider: deliveryResult.provider,
        maskedRecipient: deliveryResult.maskedRecipient || recipientEmail.replace(/.(?=.{4})/g, '*'),
        message: 'Email sent successfully',
        delivered: true,
        requestId: rid,
      });
    }

    console.error(`[${rid}] [Email] STEP 5 FAIL: ${deliveryResult.error}`);
    return res.status(400).json({
      success: false,
      status: 'failed',
      error: deliveryResult.error || 'Failed to send email',
      provider: deliveryResult.provider,
      requestId: rid,
      _trace: { step: 5, file: 'email-workflow.controller.js', fn: 'sendEmailNow', condition: 'deliverEmail returned !success', error: deliveryResult.error }
    });
  } catch (error) {
    console.error(`[${rid}] [Email] EXCEPTION in sendEmailNow: ${error.message}`);
    console.error(`[${rid}] [Email] Stack: ${error.stack}`);
    return res.status(500).json({
      success: false, error: 'Failed to send email', details: error.message, requestId: rid,
      _trace: { step: 'EXCEPTION', file: 'email-workflow.controller.js', fn: 'sendEmailNow', line: 347, exception: error.message }
    });
  }
}

export async function scheduleEmailHandler(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, scheduledAt, senderOverride } = req.body;

    console.log(`[${rid}] [Email] [scheduleEmailHandler] START: template=${templateId}, to=${recipientEmail}, at=${scheduledAt}`);
    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) {
      console.error(`[${rid}] [Email] [scheduleEmailHandler] FAILED: Chat ${chatId} not found`);
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }

    console.log(`[${rid}] [Email] [scheduleEmailHandler] Loading template ${templateId}`);
    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) {
      console.error(`[${rid}] [Email] [scheduleEmailHandler] FAILED: Template ${templateId} not found`);
      return res.status(404).json({ success: false, error: 'Template not found' });
    }
    console.log(`[${rid}] [Email] [scheduleEmailHandler] Template loaded: status=${templateResult.approvalStatus}`);

    console.log(`[${rid}] [Email] [scheduleEmailHandler] Preparing to schedule (mode=schedule)`);
    const deliveryResult = await deliverEmail({
      templateId, chatId, userId,
      recipientEmail,
      emailData: templateResult.template,
      mode: 'schedule',
      scheduledAt,
      senderOverride,
    });
    console.log(`[${rid}] [Email] [scheduleEmailHandler] Result:`, JSON.stringify(deliveryResult));

    if (deliveryResult.success) {
      console.log(`[${rid}] [Email] [scheduleEmailHandler] SUCCESS: id=${deliveryResult.messageId}, provider=${deliveryResult.provider}`);
      return res.json({
        success: true,
        status: 'scheduled',
        messageId: deliveryResult.messageId,
        provider: deliveryResult.provider,
        maskedRecipient: deliveryResult.maskedRecipient || recipientEmail.replace(/.(?=.{4})/g, '*'),
        scheduledAt,
        message: 'Email scheduled successfully',
        delivered: true,
      });
    }

    console.error(`[${rid}] [Email] [scheduleEmailHandler] FAILED: ${deliveryResult.error}`);
    return res.status(400).json({
      success: false,
      status: 'failed',
      error: deliveryResult.error || 'Failed to schedule email',
      provider: deliveryResult.provider,
    });
  } catch (error) {
    console.error(`[${rid}] [Email] [scheduleEmailHandler] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [scheduleEmailHandler] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to schedule email', details: error.message });
  }
}

export async function cancelScheduledEmailHandler(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { scheduledId } = req.params;
    const userId = req.user.id;
    console.log(`[${rid}] [Email] [cancelScheduledEmailHandler] START: scheduledId=${scheduledId}`);

    const delivery = await prisma.emailDeliveryLog.findFirst({
      where: { providerMessageId: scheduledId },
      include: { campaign: true }
    });

    if (!delivery) {
      console.error(`[${rid}] [Email] [cancelScheduledEmailHandler] FAILED: Not found`);
      return res.status(404).json({ success: false, error: 'Scheduled email not found' });
    }

    const template = await prisma.emailTemplate.findFirst({ where: { id: delivery.emailCampaignId } });
    if (!template || template.userId !== userId) {
      console.error(`[${rid}] [Email] [cancelScheduledEmailHandler] FAILED: Access denied`);
      return res.status(403).json({ success: false, error: 'Access denied' });
    }

    const result = await cancelScheduledEmail(scheduledId);
    if (result.success) {
      await prisma.emailDeliveryLog.update({
        where: { id: delivery.id }, data: { status: 'CANCELLED' }
      });
      console.log(`[${rid}] [Email] [cancelScheduledEmailHandler] SUCCESS`);
    } else {
      console.error(`[${rid}] [Email] [cancelScheduledEmailHandler] FAILED: ${result.error?.code || 'UNKNOWN'}`);
    }

    return res.json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [cancelScheduledEmailHandler] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [cancelScheduledEmailHandler] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to cancel scheduled email', details: error.message });
  }
}

export async function getDeliveryStatusHandler(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    console.log(`[${rid}] [Email] [getDeliveryStatusHandler] START: templateId=${templateId}`);

    const result = await getDeliveryStatus(templateId, userId);
    if (result.success) {
      console.log(`[${rid}] [Email] [getDeliveryStatusHandler] SUCCESS: count=${result.count}`);
      return res.json({
        success: true,
        status: 'found',
        deliveries: result.deliveries,
        count: result.count,
        approvalStatus: result.deliveries?.[0]?.campaign?.approvalStatus || null
      });
    }
    console.error(`[${rid}] [Email] [getDeliveryStatusHandler] FAILED: ${result.error}`);
    return res.status(404).json(result);
  } catch (error) {
    console.error(`[${rid}] [Email] [getDeliveryStatusHandler] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [getDeliveryStatusHandler] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to get delivery status', details: error.message });
  }
}

export async function generateHtml(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const emailData = req.body;
    console.log(`[${rid}] [Email] [generateHtml] START`);
    const html = generateEmailHtmlTemplate(emailData);
    console.log(`[${rid}] [Email] [generateHtml] SUCCESS: ${html.length} chars`);
    return res.json({ success: true, html, status: 'generated' });
  } catch (error) {
    console.error(`[${rid}] [Email] [generateHtml] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [generateHtml] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to generate HTML', details: error.message });
  }
}

export async function generatePlainText(req, res) {
  const rid = req.requestId || 'NO_RID';
  try {
    const emailData = req.body;
    console.log(`[${rid}] [Email] [generatePlainText] START`);
    const plainText = generatePlainTextFromEmailData(emailData);
    console.log(`[${rid}] [Email] [generatePlainText] SUCCESS: ${plainText.length} chars`);
    return res.json({ success: true, plainText, status: 'generated' });
  } catch (error) {
    console.error(`[${rid}] [Email] [generatePlainText] FAILED: ${error.message}`);
    console.error(`[${rid}] [Email] [generatePlainText] Stack: ${error.stack}`);
    return res.status(500).json({ success: false, error: 'Failed to generate plain text', details: error.message });
  }
}
