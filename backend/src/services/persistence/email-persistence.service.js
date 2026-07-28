import prisma from "../../config/prisma.js";

export async function saveEmailDraft(userId, chatId, emailData) {
  try {
    const {
      emailType, goal, tone, audience, language, sender, recipient,
      subject, subjectAlternatives, previewText, greeting, headline,
      opening, painPoint, solution, benefits, bodyParagraphs, socialProof,
      primaryCta, secondaryCta, closing, signature, postscript,
      complianceFooter, unsubscribeText, html, plainText, evidenceUsed,
      quality, contentAssetId, spamScore, readabilityScore
    } = emailData;

    let template;
    if (contentAssetId) {
      template = await prisma.emailTemplate.findFirst({
        where: { userId, contentAssetId, approvalStatus: 'DRAFT' }
      });
    }

    const personalizationFields = {
      evidenceUsed, quality, goal, tone, audience, language,
      subjectAlternatives, greeting, headline, opening, painPoint,
      solution, benefits, bodyParagraphs, socialProof, primaryCta,
      secondaryCta, closing, signature, postscript, complianceFooter,
      unsubscribeText, recipient, spamScore, readabilityScore,
      version: template?.personalizationFields?.version ? template.personalizationFields.version + 1 : 1
    };

    const templateData = {
      name: subject || 'Untitled Template',
      userId,
      chatId,
      category: emailType,
      subjectLine: subject,
      previewText,
      emailBodyText: plainText,
      emailBodyHtml: html,
      senderName: sender?.name,
      senderEmail: sender?.email,
      replyToEmail: sender?.replyTo,
      contentAssetId,
      personalizationFields,
      quality: quality || null,
      approvalStatus: 'DRAFT'
    };

    if (template) {
      template = await prisma.emailTemplate.update({
        where: { id: template.id },
        data: templateData
      });
    } else {
      template = await prisma.emailTemplate.create({
        data: templateData
      });
    }

    return {
      success: true,
      template,
      approvalStatus: template.approvalStatus,
      assetId: template.id,
      message: 'Email draft saved successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Save draft error:', error.message);
    return { success: false, error: 'Failed to save email draft', details: error.message };
  }
}

export async function updateEmailTemplate(templateId, userId, emailData) {
  try {
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!existing) return { success: false, error: 'Email template not found or access denied' };

    const {
      emailType, goal, tone, audience, language, sender, recipient,
      subject, subjectAlternatives, previewText, greeting, headline,
      opening, painPoint, solution, benefits, bodyParagraphs, socialProof,
      primaryCta, secondaryCta, closing, signature, postscript,
      complianceFooter, unsubscribeText, html, plainText, evidenceUsed,
      quality, spamScore, readabilityScore
    } = emailData;

    const existingPf = existing.personalizationFields || {};
    const personalizationFields = {
      evidenceUsed, quality, goal, tone, audience, language,
      subjectAlternatives, greeting, headline, opening, painPoint,
      solution, benefits, bodyParagraphs, socialProof, primaryCta,
      secondaryCta, closing, signature, postscript, complianceFooter,
      unsubscribeText, recipient, spamScore, readabilityScore,
      version: (existingPf.version || 1) + 1
    };

    const template = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        name: subject || existing.name,
        category: emailType,
        subjectLine: subject,
        previewText,
        emailBodyText: plainText,
        emailBodyHtml: html,
        senderName: sender?.name,
        senderEmail: sender?.email,
        replyToEmail: sender?.replyTo,
        personalizationFields,
        quality: quality || existing.quality
      }
    });

    return {
      success: true,
      template,
      approvalStatus: template.approvalStatus,
      assetId: template.id,
      message: 'Email template updated successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Update template error:', error.message);
    return { success: false, error: 'Failed to update email template', details: error.message };
  }
}

export async function approveEmailTemplate(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) return { success: false, error: 'Email template not found or access denied' };

    if (template.approvalStatus === 'APPROVED') {
      return { success: true, template, approvalStatus: 'APPROVED', message: 'Email template already approved' };
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: { approvalStatus: 'APPROVED', approvedAt: new Date() }
    });

    return {
      success: true,
      template: updated,
      approvalStatus: 'APPROVED',
      assetId: updated.id,
      message: 'Email template approved successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Approve template error:', error.message);
    return { success: false, error: 'Failed to approve email template', details: error.message };
  }
}

export async function rejectEmailTemplate(templateId, userId, reason) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) return { success: false, error: 'Email template not found or access denied' };

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        approvalStatus: 'REJECTED',
        quality: { ...(template.quality || {}), rejectionReason: reason }
      }
    });

    return {
      success: true,
      template: updated,
      approvalStatus: 'REJECTED',
      assetId: updated.id,
      message: 'Email template rejected'
    };
  } catch (error) {
    console.error('[EmailPersistence] Reject template error:', error.message);
    return { success: false, error: 'Failed to reject email template', details: error.message };
  }
}

export async function getEmailTemplate(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) return { success: false, error: 'Email template not found' };

    return {
      success: true,
      template,
      approvalStatus: template.approvalStatus,
      assetId: template.id,
      quality: template.quality,
      validation: template.personalizationFields?.quality || null
    };
  } catch (error) {
    console.error('[EmailPersistence] Get template error:', error.message);
    return { success: false, error: 'Failed to get email template', details: error.message };
  }
}

export async function listEmailTemplates(userId, chatId, filters = {}) {
  try {
    const { approvalStatus, emailType } = filters;
    const where = { userId, ...(chatId && { chatId }), ...(approvalStatus && { approvalStatus }), ...(emailType && { category: emailType }) };

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, templates, count: templates.length };
  } catch (error) {
    console.error('[EmailPersistence] List templates error:', error.message);
    return { success: false, error: 'Failed to list email templates', details: error.message };
  }
}

export async function deleteEmailTemplate(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) return { success: false, error: 'Email template not found or access denied' };
    if (template.approvalStatus === 'APPROVED') return { success: false, error: 'Cannot delete approved email template' };

    await prisma.emailTemplate.delete({ where: { id: templateId } });
    return { success: true, message: 'Email template deleted successfully' };
  } catch (error) {
    console.error('[EmailPersistence] Delete template error:', error.message);
    return { success: false, error: 'Failed to delete email template', details: error.message };
  }
}

export async function saveDeliveryRecord(templateId, recipientId, deliveryData) {
  try {
    const { brevoMessageId, brevoCampaignId, status, scheduledAt, errorMessage, errorCategory } = deliveryData;

    const delivery = await prisma.emailDeliveryLog.create({
      data: {
        emailCampaignId: templateId,
        recipientEmail: recipientId,
        provider: 'brevo',
        providerMessageId: brevoMessageId,
        status: status || 'QUEUED',
        errorMessage,
        errorCategory
      }
    });

    return { success: true, delivery, message: 'Delivery record saved successfully' };
  } catch (error) {
    console.error('[EmailPersistence] Save delivery error:', error.message);
    return { success: false, error: 'Failed to save delivery record', details: error.message };
  }
}

export async function updateDeliveryStatus(deliveryId, statusData) {
  try {
    const { status, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, failedAt, errorMessage, errorCategory } = statusData;

    const delivery = await prisma.emailDeliveryLog.update({
      where: { id: deliveryId },
      data: { status, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, failedAt, errorMessage, errorCategory }
    });

    return { success: true, delivery, message: 'Delivery status updated successfully' };
  } catch (error) {
    console.error('[EmailPersistence] Update delivery status error:', error.message);
    return { success: false, error: 'Failed to update delivery status', details: error.message };
  }
}

export async function getDeliveryStatus(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) return { success: false, error: 'Email template not found' };

    const deliveries = await prisma.emailDeliveryLog.findMany({
      where: { emailCampaignId: templateId },
      orderBy: { createdAt: 'desc' }
    });

    return { success: true, deliveries, count: deliveries.length };
  } catch (error) {
    console.error('[EmailPersistence] Get delivery status error:', error.message);
    return { success: false, error: 'Failed to get delivery status', details: error.message };
  }
}