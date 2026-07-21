/**
 * Email Persistence Service
 * Handles saving, updating, approving, and rejecting email templates
 */

import { prisma } from '../config/prisma.js';

/**
 * Save email template as draft
 */
export async function saveEmailDraft(userId, chatId, emailData) {
  try {
    const {
      emailType,
      goal,
      tone,
      audience,
      language,
      sender,
      recipient,
      subject,
      subjectAlternatives,
      previewText,
      greeting,
      headline,
      opening,
      painPoint,
      solution,
      benefits,
      bodyParagraphs,
      socialProof,
      primaryCta,
      secondaryCta,
      closing,
      signature,
      postscript,
      complianceFooter,
      unsubscribeText,
      html,
      plainText,
      evidenceUsed,
      quality,
      contentAssetId
    } = emailData;

    // Check if template exists for this content asset
    let template;
    
    if (contentAssetId) {
      template = await prisma.emailTemplate.findFirst({
        where: {
          userId,
          contentAssetId,
          approvalStatus: 'DRAFT'
        }
      });
    }

    const templateData = {
      userId,
      chatId,
      contentAssetId,
      emailType,
      goal,
      tone,
      audience,
      language,
      senderName: sender?.name,
      senderEmail: sender?.email,
      replyToEmail: sender?.replyTo,
      subject,
      subjectAlternatives,
      previewText,
      greeting,
      headline,
      opening,
      painPoint,
      solution,
      benefits,
      bodyParagraphs,
      socialProof,
      primaryCta,
      secondaryCta,
      closing,
      signature,
      postscript,
      complianceFooter,
      unsubscribeText,
      htmlContent: html,
      plainTextContent: plainText,
      structuredContent: {
        emailType,
        goal,
        tone,
        audience,
        sender,
        recipient,
        subject,
        subjectAlternatives,
        previewText,
        greeting,
        headline,
        opening,
        painPoint,
        solution,
        benefits,
        bodyParagraphs,
        socialProof,
        primaryCta,
        secondaryCta,
        closing,
        signature,
        postscript,
        complianceFooter,
        unsubscribeText,
        evidenceUsed,
        quality
      },
      evidenceUsed,
      quality,
      approvalStatus: 'DRAFT',
      version: 1
    };

    if (template) {
      // Update existing draft
      template = await prisma.emailTemplate.update({
        where: { id: template.id },
        data: templateData
      });
    } else {
      // Create new draft
      template = await prisma.emailTemplate.create({
        data: templateData
      });
    }

    // Save recipient if provided
    if (recipient && recipient.email) {
      await prisma.emailRecipient.upsert({
        where: {
          id: recipient.id || ''
        },
        update: {
          email: recipient.email,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          companyName: recipient.companyName
        },
        create: {
          emailTemplateId: template.id,
          email: recipient.email,
          firstName: recipient.firstName,
          lastName: recipient.lastName,
          companyName: recipient.companyName
        }
      });
    }

    return {
      success: true,
      template,
      message: 'Email draft saved successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Save draft error:', error.message);
    return {
      success: false,
      error: 'Failed to save email draft',
      details: error.message
    };
  }
}

/**
 * Update existing email template
 */
export async function updateEmailTemplate(templateId, userId, emailData) {
  try {
    // Verify ownership
    const existing = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });

    if (!existing) {
      return {
        success: false,
        error: 'Email template not found or access denied'
      };
    }

    const {
      emailType,
      goal,
      tone,
      audience,
      language,
      sender,
      recipient,
      subject,
      subjectAlternatives,
      previewText,
      greeting,
      headline,
      opening,
      painPoint,
      solution,
      benefits,
      bodyParagraphs,
      socialProof,
      primaryCta,
      secondaryCta,
      closing,
      signature,
      postscript,
      complianceFooter,
      unsubscribeText,
      html,
      plainText,
      evidenceUsed,
      quality
    } = emailData;

    const template = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        emailType,
        goal,
        tone,
        audience,
        language,
        senderName: sender?.name,
        senderEmail: sender?.email,
        replyToEmail: sender?.replyTo,
        subject,
        subjectAlternatives,
        previewText,
        greeting,
        headline,
        opening,
        painPoint,
        solution,
        benefits,
        bodyParagraphs,
        socialProof,
        primaryCta,
        secondaryCta,
        closing,
        signature,
        postscript,
        complianceFooter,
        unsubscribeText,
        htmlContent: html,
        plainTextContent: plainText,
        structuredContent: {
          emailType,
          goal,
          tone,
          audience,
          sender,
          recipient,
          subject,
          subjectAlternatives,
          previewText,
          greeting,
          headline,
          opening,
          painPoint,
          solution,
          benefits,
          bodyParagraphs,
          socialProof,
          primaryCta,
          secondaryCta,
          closing,
          signature,
          postscript,
          complianceFooter,
          unsubscribeText,
          evidenceUsed,
          quality
        },
        evidenceUsed,
        quality,
        version: existing.version + 1
      }
    });

    // Update recipient if provided
    if (recipient && recipient.email) {
      const existingRecipient = await prisma.emailRecipient.findFirst({
        where: { emailTemplateId: templateId }
      });

      if (existingRecipient) {
        await prisma.emailRecipient.update({
          where: { id: existingRecipient.id },
          data: {
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            companyName: recipient.companyName
          }
        });
      } else {
        await prisma.emailRecipient.create({
          data: {
            emailTemplateId: templateId,
            email: recipient.email,
            firstName: recipient.firstName,
            lastName: recipient.lastName,
            companyName: recipient.companyName
          }
        });
      }
    }

    return {
      success: true,
      template,
      message: 'Email template updated successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Update template error:', error.message);
    return {
      success: false,
      error: 'Failed to update email template',
      details: error.message
    };
  }
}

/**
 * Approve email template
 */
export async function approveEmailTemplate(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });

    if (!template) {
      return {
        success: false,
        error: 'Email template not found or access denied'
      };
    }

    if (template.approvalStatus === 'APPROVED') {
      return {
        success: true,
        template,
        message: 'Email template already approved'
      };
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        approvalStatus: 'APPROVED',
        approvedAt: new Date()
      }
    });

    return {
      success: true,
      template: updated,
      message: 'Email template approved successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Approve template error:', error.message);
    return {
      success: false,
      error: 'Failed to approve email template',
      details: error.message
    };
  }
}

/**
 * Reject email template
 */
export async function rejectEmailTemplate(templateId, userId, reason) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });

    if (!template) {
      return {
        success: false,
        error: 'Email template not found or access denied'
      };
    }

    const updated = await prisma.emailTemplate.update({
      where: { id: templateId },
      data: {
        approvalStatus: 'REJECTED',
        quality: {
          ...template.quality,
          rejectionReason: reason
        }
      }
    });

    return {
      success: true,
      template: updated,
      message: 'Email template rejected'
    };
  } catch (error) {
    console.error('[EmailPersistence] Reject template error:', error.message);
    return {
      success: false,
      error: 'Failed to reject email template',
      details: error.message
    };
  }
}

/**
 * Get email template by ID
 */
export async function getEmailTemplate(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId },
      include: {
        recipients: true,
        deliveries: true
      }
    });

    if (!template) {
      return {
        success: false,
        error: 'Email template not found'
      };
    }

    return {
      success: true,
      template
    };
  } catch (error) {
    console.error('[EmailPersistence] Get template error:', error.message);
    return {
      success: false,
      error: 'Failed to get email template',
      details: error.message
    };
  }
}

/**
 * List email templates for user
 */
export async function listEmailTemplates(userId, chatId, filters = {}) {
  try {
    const { approvalStatus, emailType } = filters;

    const where = {
      userId,
      ...(chatId && { chatId }),
      ...(approvalStatus && { approvalStatus }),
      ...(emailType && { emailType })
    };

    const templates = await prisma.emailTemplate.findMany({
      where,
      include: {
        recipients: true,
        deliveries: {
          orderBy: { createdAt: 'desc' },
          take: 1
        }
      },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      templates,
      count: templates.length
    };
  } catch (error) {
    console.error('[EmailPersistence] List templates error:', error.message);
    return {
      success: false,
      error: 'Failed to list email templates',
      details: error.message
    };
  }
}

/**
 * Delete email template
 */
export async function deleteEmailTemplate(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });

    if (!template) {
      return {
        success: false,
        error: 'Email template not found or access denied'
      };
    }

    if (template.approvalStatus === 'APPROVED') {
      return {
        success: false,
        error: 'Cannot delete approved email template'
      };
    }

    await prisma.emailTemplate.delete({
      where: { id: templateId }
    });

    return {
      success: true,
      message: 'Email template deleted successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Delete template error:', error.message);
    return {
      success: false,
      error: 'Failed to delete email template',
      details: error.message
    };
  }
}

/**
 * Save delivery record
 */
export async function saveDeliveryRecord(templateId, recipientId, deliveryData) {
  try {
    const {
      brevoMessageId,
      brevoCampaignId,
      status,
      scheduledAt,
      errorMessage,
      errorCategory
    } = deliveryData;

    const delivery = await prisma.emailDelivery.create({
      data: {
        emailTemplateId: templateId,
        recipientId,
        brevoMessageId,
        brevoCampaignId,
        status: status || 'QUEUED',
        scheduledAt,
        errorMessage,
        errorCategory
      }
    });

    return {
      success: true,
      delivery,
      message: 'Delivery record saved successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Save delivery error:', error.message);
    return {
      success: false,
      error: 'Failed to save delivery record',
      details: error.message
    };
  }
}

/**
 * Update delivery status
 */
export async function updateDeliveryStatus(deliveryId, statusData) {
  try {
    const { status, sentAt, deliveredAt, openedAt, clickedAt, bouncedAt, failedAt, errorMessage, errorCategory } = statusData;

    const delivery = await prisma.emailDelivery.update({
      where: { id: deliveryId },
      data: {
        status,
        sentAt,
        deliveredAt,
        openedAt,
        clickedAt,
        bouncedAt,
        failedAt,
        errorMessage,
        errorCategory
      }
    });

    return {
      success: true,
      delivery,
      message: 'Delivery status updated successfully'
    };
  } catch (error) {
    console.error('[EmailPersistence] Update delivery status error:', error.message);
    return {
      success: false,
      error: 'Failed to update delivery status',
      details: error.message
    };
  }
}

/**
 * Get delivery status for template
 */
export async function getDeliveryStatus(templateId, userId) {
  try {
    const template = await prisma.emailTemplate.findFirst({
      where: { id: templateId, userId }
    });

    if (!template) {
      return {
        success: false,
        error: 'Email template not found'
      };
    }

    const deliveries = await prisma.emailDelivery.findMany({
      where: { emailTemplateId: templateId },
      include: { recipient: true },
      orderBy: { createdAt: 'desc' }
    });

    return {
      success: true,
      deliveries,
      count: deliveries.length
    };
  } catch (error) {
    console.error('[EmailPersistence] Get delivery status error:', error.message);
    return {
      success: false,
      error: 'Failed to get delivery status',
      details: error.message
    };
  }
}
