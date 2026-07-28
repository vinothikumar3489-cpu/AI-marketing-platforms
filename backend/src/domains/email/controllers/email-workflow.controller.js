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
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const emailData = req.body;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const result = await saveEmailDraft(userId, chatId, emailData);
    if (result.success) {
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
    return res.status(500).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Save draft error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to save draft', details: error.message });
  }
}

export async function updateTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const emailData = req.body;

    const result = await updateEmailTemplate(templateId, userId, emailData);
    if (result.success) {
      return res.json({
        success: true,
        status: 'updated',
        assetId: result.assetId,
        template: result.template,
        approvalStatus: result.approvalStatus || 'DRAFT',
        quality: result.template?.quality || null
      });
    }
    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Update template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to update template', details: error.message });
  }
}

export async function approveTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await approveEmailTemplate(templateId, userId);
    if (result.success) {
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
    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Approve template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to approve template', details: error.message });
  }
}

export async function rejectTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;
    const { reason } = req.body;

    const result = await rejectEmailTemplate(templateId, userId, reason);
    if (result.success) {
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
    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Reject template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to reject template', details: error.message });
  }
}

export async function getTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await getEmailTemplate(templateId, userId);
    if (result.success) {
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
    return res.status(404).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Get template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get template', details: error.message });
  }
}

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

export async function deleteTemplate(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await deleteEmailTemplate(templateId, userId);
    if (result.success) return res.json(result);
    return res.status(400).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Delete template error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to delete template', details: error.message });
  }
}

export async function sendTestEmailHandler(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, senderOverride } = req.body;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) return res.status(404).json({ success: false, error: 'Template not found' });

    const deliveryResult = await deliverEmail({
      templateId, chatId, userId,
      recipientEmail,
      emailData: templateResult.template,
      mode: 'test',
    });

    if (deliveryResult.success) {
      return res.json({
        success: true,
        status: 'test_sent',
        messageId: deliveryResult.messageId,
        provider: deliveryResult.provider,
        maskedRecipient: deliveryResult.maskedRecipient || deliveryResult.recipientEmail?.replace(/.(?=.{4})/g, '*'),
        message: 'Test email sent',
        delivered: true,
      });
    }

    return res.status(400).json({
      success: false,
      status: 'failed',
      error: deliveryResult.error || 'Failed to send test email',
      provider: deliveryResult.provider,
    });
  } catch (error) {
    console.error('[EmailWorkflow] Send test email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send test email', details: error.message });
  }
}

export async function sendEmailNow(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, senderOverride } = req.body;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) return res.status(404).json({ success: false, error: 'Template not found' });

    const deliveryResult = await deliverEmail({
      templateId, chatId, userId,
      recipientEmail,
      emailData: templateResult.template,
      mode: 'now',
      senderOverride,
    });

    if (deliveryResult.success) {
      return res.json({
        success: true,
        status: 'sent',
        messageId: deliveryResult.messageId,
        provider: deliveryResult.provider,
        maskedRecipient: deliveryResult.maskedRecipient || recipientEmail.replace(/.(?=.{4})/g, '*'),
        message: 'Email sent successfully',
        delivered: true,
      });
    }

    return res.status(400).json({
      success: false,
      status: 'failed',
      error: deliveryResult.error || 'Failed to send email',
      provider: deliveryResult.provider,
    });
  } catch (error) {
    console.error('[EmailWorkflow] Send email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to send email', details: error.message });
  }
}

export async function scheduleEmailHandler(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;
    const { templateId, recipientEmail, scheduledAt, senderOverride } = req.body;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const templateResult = await getEmailTemplate(templateId, userId);
    if (!templateResult.success) return res.status(404).json({ success: false, error: 'Template not found' });

    const deliveryResult = await deliverEmail({
      templateId, chatId, userId,
      recipientEmail,
      emailData: templateResult.template,
      mode: 'schedule',
      scheduledAt,
      senderOverride,
    });

    if (deliveryResult.success) {
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

    return res.status(400).json({
      success: false,
      status: 'failed',
      error: deliveryResult.error || 'Failed to schedule email',
      provider: deliveryResult.provider,
    });
  } catch (error) {
    console.error('[EmailWorkflow] Schedule email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to schedule email', details: error.message });
  }
}

export async function cancelScheduledEmailHandler(req, res) {
  try {
    const { scheduledId } = req.params;
    const userId = req.user.id;

    const delivery = await prisma.emailDeliveryLog.findFirst({
      where: { providerMessageId: scheduledId },
      include: { campaign: true }
    });

    if (!delivery) return res.status(404).json({ success: false, error: 'Scheduled email not found' });

    const template = await prisma.emailTemplate.findFirst({ where: { id: delivery.emailCampaignId } });
    if (!template || template.userId !== userId) return res.status(403).json({ success: false, error: 'Access denied' });

    const result = await cancelScheduledEmail(scheduledId);
    if (result.success) {
      await prisma.emailDeliveryLog.update({
        where: { id: delivery.id }, data: { status: 'CANCELLED' }
      });
    }

    return res.json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Cancel scheduled email error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to cancel scheduled email', details: error.message });
  }
}

export async function getDeliveryStatusHandler(req, res) {
  try {
    const { templateId } = req.params;
    const userId = req.user.id;

    const result = await getDeliveryStatus(templateId, userId);
    if (result.success) {
      return res.json({
        success: true,
        status: 'found',
        deliveries: result.deliveries,
        count: result.count,
        approvalStatus: result.deliveries?.[0]?.campaign?.approvalStatus || null
      });
    }
    return res.status(404).json(result);
  } catch (error) {
    console.error('[EmailWorkflow] Get delivery status error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to get delivery status', details: error.message });
  }
}

export async function generateHtml(req, res) {
  try {
    const emailData = req.body;
    const html = generateEmailHtmlTemplate(emailData);
    return res.json({ success: true, html, status: 'generated' });
  } catch (error) {
    console.error('[EmailWorkflow] Generate HTML error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate HTML', details: error.message });
  }
}

export async function generatePlainText(req, res) {
  try {
    const emailData = req.body;
    const plainText = generatePlainTextFromEmailData(emailData);
    return res.json({ success: true, plainText, status: 'generated' });
  } catch (error) {
    console.error('[EmailWorkflow] Generate plain text error:', error.message);
    return res.status(500).json({ success: false, error: 'Failed to generate plain text', details: error.message });
  }
}