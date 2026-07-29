import prisma from "../../config/prisma.js";

export async function saveEmailDraft(userId, chatId, emailData) {
  const fn = 'saveEmailDraft';
  try {
    console.log(`[EmailPersistence] [${fn}] START: userId=${userId}, chatId=${chatId}`);
    const {
      emailType, goal, tone, audience, language, sender, recipient,
      subject, subjectAlternatives, previewText, greeting, headline,
      opening, painPoint, solution, benefits, bodyParagraphs, socialProof,
      callToAction, primaryCta, secondaryCta, closing, signature, postscript,
      complianceFooter, unsubscribeText, html, plainText, evidenceUsed,
      quality, contentAssetId, spamScore, readabilityScore
    } = emailData;

    const cta = callToAction || primaryCta || emailData.cta;

    let template;
    if (contentAssetId) {
      template = await prisma.emailTemplate.findFirst({
        where: { userId, contentAssetId, approvalStatus: 'DRAFT' }
      });
    }

    const personalizationFields = {
      evidenceUsed, quality, goal, tone, audience, language,
      subjectAlternatives, greeting, headline, opening, painPoint,
      solution, benefits, bodyParagraphs, socialProof,
      primaryCta: cta, callToAction: cta,
      secondaryCta, closing, signature, postscript, complianceFooter,
      unsubscribeText, recipient, spamScore, readabilityScore,
      version: template?.personalizationFields?.version ? template.personalizationFields.version + 1 : 1
    };

    const templateData = {
      name: subject || 'Untitled Template',
      userId,
      chatId,
      category: emailType,
      subjectLine: subject || emailData.headline || emailData.subjectLine || 'Untitled',
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

    console.log(`[EmailPersistence] [${fn}] SUCCESS: id=${template.id}`);
    return {
      success: true,
      template,
      approvalStatus: template.approvalStatus,
      assetId: template.id,
      message: 'Email draft saved successfully'
    };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to save email draft', details: error.message };
  }
}

export async function updateEmailTemplate(templateId, userId, emailData) {
  const fn = 'updateEmailTemplate';
  try {
    console.log(`[EmailPersistence] [${fn}] START: templateId=${templateId}, userId=${userId}`);
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!existing) {
      console.error(`[EmailPersistence] [${fn}] FAILED: Template ${templateId} not found for user ${userId}`);
      return { success: false, error: 'Email template not found or access denied' };
    }

    const {
      emailType, goal, tone, audience, language, sender, recipient,
      subject, subjectAlternatives, previewText, greeting, headline,
      opening, painPoint, solution, benefits, bodyParagraphs, socialProof,
      callToAction, primaryCta, secondaryCta, closing, signature, postscript,
      complianceFooter, unsubscribeText, html, plainText, evidenceUsed,
      quality, spamScore, readabilityScore
    } = emailData;

    const cta = callToAction || primaryCta || emailData.cta;

    const existingPf = existing.personalizationFields || {};
    const personalizationFields = {
      evidenceUsed, quality, goal, tone, audience, language,
      subjectAlternatives, greeting, headline, opening, painPoint,
      solution, benefits, bodyParagraphs, socialProof,
      primaryCta: cta, callToAction: cta,
      secondaryCta, closing, signature, postscript, complianceFooter,
      unsubscribeText, recipient, spamScore, readabilityScore,
      version: (existingPf.version || 1) + 1
    };

    const template = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        name: subject || existing.name,
        category: emailType,
        subjectLine: subject || emailData.headline || emailData.subjectLine || 'Untitled',
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

    console.log(`[EmailPersistence] [${fn}] SUCCESS: id=${template.id}`);
    return {
      success: true,
      template,
      approvalStatus: template.approvalStatus,
      assetId: template.id,
      message: 'Email template updated successfully'
    };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to update email template', details: error.message };
  }
}

export async function approveEmailTemplate(templateId, userId) {
  try {
    console.log(`[Approve] Loading template ${templateId} for user ${userId}`);
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) {
      console.error(`[Approve] Template ${templateId} not found for user ${userId}`);
      return { success: false, error: 'Email template not found or access denied' };
    }
    console.log(`[Approve] Asset loaded: id=${template.id}, currentStatus=${template.approvalStatus}`);

    if (template.approvalStatus === 'APPROVED') {
      console.log(`[Approve] Already approved, skipping`);
      return { success: true, template, approvalStatus: 'APPROVED', message: 'Email template already approved' };
    }

    console.log(`[Approve] Changing status to APPROVED`);
    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: { approvalStatus: 'APPROVED', approvedAt: new Date(), approvedBy: userId }
    });
    console.log(`[Approve] Status changed to Approved at ${updated.approvedAt}`);

    return {
      success: true,
      template: updated,
      approvalStatus: 'APPROVED',
      approvedAt: updated.approvedAt,
      approvedBy: updated.approvedBy,
      assetId: updated.id,
      message: 'Email template approved successfully'
    };
  } catch (error) {
    console.error(`[Approve] Failed:`, error.message, error.stack);
    return { success: false, error: 'Failed to approve email template', details: error.message };
  }
}

export async function rejectEmailTemplate(templateId, userId, reason) {
  const fn = 'rejectEmailTemplate';
  try {
    console.log(`[EmailPersistence] [${fn}] START: templateId=${templateId}, userId=${userId}`);
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) {
      console.error(`[EmailPersistence] [${fn}] FAILED: Template ${templateId} not found for user ${userId}`);
      return { success: false, error: 'Email template not found or access denied' };
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        approvalStatus: 'REJECTED',
        quality: { ...(template.quality || {}), rejectionReason: reason }
      }
    });

    console.log(`[EmailPersistence] [${fn}] SUCCESS: id=${updated.id}`);
    return {
      success: true,
      template: updated,
      approvalStatus: 'REJECTED',
      assetId: updated.id,
      message: 'Email template rejected'
    };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to reject email template', details: error.message };
  }
}

export async function getEmailTemplate(templateId, userId) {
  const fn = 'getEmailTemplate';
  try {
    console.log(`[EmailPersistence] [${fn}] START: templateId=${templateId}`);
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) {
      console.error(`[EmailPersistence] [${fn}] FAILED: Template ${templateId} not found`);
      return { success: false, error: 'Email template not found' };
    }

    console.log(`[EmailPersistence] [${fn}] SUCCESS: id=${template.id}, status=${template.approvalStatus}`);
    return {
      success: true,
      template,
      approvalStatus: template.approvalStatus,
      assetId: template.id,
      quality: template.quality,
      approvedAt: template.approvedAt,
      approvedBy: template.approvedBy,
      validation: template.personalizationFields?.quality || null
    };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to get email template', details: error.message };
  }
}

export async function listEmailTemplates(userId, chatId, filters = {}) {
  const fn = 'listEmailTemplates';
  try {
    console.log(`[EmailPersistence] [${fn}] START: userId=${userId}, chatId=${chatId}`);
    const { approvalStatus, emailType } = filters;
    const where = { userId, ...(chatId && { chatId }), ...(approvalStatus && { approvalStatus }), ...(emailType && { category: emailType }) };

    const templates = await prisma.emailTemplate.findMany({
      where,
      orderBy: { createdAt: 'desc' }
    });

    console.log(`[EmailPersistence] [${fn}] SUCCESS: count=${templates.length}`);
    return { success: true, templates, count: templates.length };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to list email templates', details: error.message };
  }
}

export async function deleteEmailTemplate(templateId, userId) {
  const fn = 'deleteEmailTemplate';
  try {
    console.log(`[EmailPersistence] [${fn}] START: templateId=${templateId}`);
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) {
      console.error(`[EmailPersistence] [${fn}] FAILED: Template ${templateId} not found`);
      return { success: false, error: 'Email template not found or access denied' };
    }
    if (template.approvalStatus === 'APPROVED') {
      console.error(`[EmailPersistence] [${fn}] FAILED: Cannot delete approved template ${templateId}`);
      return { success: false, error: 'Cannot delete approved email template' };
    }

    await prisma.emailTemplate.delete({ where: { id: templateId } });
    console.log(`[EmailPersistence] [${fn}] SUCCESS: Deleted template ${templateId}`);
    return { success: true, message: 'Email template deleted successfully' };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to delete email template', details: error.message };
  }
}

export async function saveDeliveryRecord(templateId, recipientId, deliveryData) {
  const fn = 'saveDeliveryRecord';
  try {
    console.log(`[EmailPersistence] [${fn}] START: templateId=${templateId}, recipientId=${recipientId}`);
    const { brevoMessageId, brevoCampaignId, status, scheduledAt, errorMessage, errorCategory } = deliveryData;

    const delivery = await prisma.emailDeliveryLog.create({
      data: {
        recipientEmail: recipientId,
        provider: 'brevo',
        providerMessageId: brevoMessageId,
        status: status || 'QUEUED',
        errorMessage,
        errorCategory
      }
    });

    console.log(`[EmailPersistence] [${fn}] SUCCESS: id=${delivery.id}`);
    return { success: true, delivery, message: 'Delivery record saved successfully' };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to save delivery record', details: error.message };
  }
}

export async function updateDeliveryStatus(deliveryId, statusData) {
  const fn = 'updateDeliveryStatus';
  try {
    console.log(`[EmailPersistence] [${fn}] START: deliveryId=${deliveryId}`);
    const { status, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, failedAt, errorMessage, errorCategory } = statusData;

    const delivery = await prisma.emailDeliveryLog.update({
      where: { id: deliveryId },
      data: { status, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, failedAt, errorMessage, errorCategory }
    });

    console.log(`[EmailPersistence] [${fn}] SUCCESS: id=${delivery.id}, status=${status}`);
    return { success: true, delivery, message: 'Delivery status updated successfully' };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to update delivery status', details: error.message };
  }
}

export async function getDeliveryStatus(templateId, userId) {
  const fn = 'getDeliveryStatus';
  try {
    console.log(`[EmailPersistence] [${fn}] START: templateId=${templateId}`);
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });
    if (!template) {
      console.error(`[EmailPersistence] [${fn}] FAILED: Template ${templateId} not found`);
      return { success: false, error: 'Email template not found' };
    }

    const allLogs = await prisma.emailDeliveryLog.findMany({
      where: { emailCampaignId: null },
      orderBy: { createdAt: 'desc' },
      take: 100,
    });
    const deliveries = allLogs.filter(d =>
      d.metadata && typeof d.metadata === 'object' && d.metadata.templateId === templateId
    );

    console.log(`[EmailPersistence] [${fn}] SUCCESS: count=${deliveries.length}`);
    return { success: true, deliveries, count: deliveries.length };
  } catch (error) {
    console.error(`[EmailPersistence] [${fn}] FAILED: ${error.message}`);
    console.error(`[EmailPersistence] [${fn}] Stack: ${error.stack}`);
    return { success: false, error: 'Failed to get delivery status', details: error.message };
  }
}