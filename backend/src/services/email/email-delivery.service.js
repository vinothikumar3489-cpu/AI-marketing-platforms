import { sendEmail, getActiveProvider } from '../providers/email/email-provider-registry.js';
import { validateRecipient, maskEmail } from '../providers/email/email-provider.interface.js';
import { generateEmailHtmlTemplate } from './email-html-generator.service.js';
import prisma from '../../config/prisma.js';

function generatePlainTextFromHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

function getStageLogger(context) {
  return (stage, data = {}) => {
    const prefix = context.templateId ? `[Mail:${context.templateId.slice(-8)}]` : '[Mail]';
    const msg = data.error ? `${stage}: ${data.error}` : data.success ? `${stage}` : stage;
    if (data.error) {
      console.error(`${prefix} ${msg}`, data.detail || '');
    } else if (data.success) {
      console.log(`${prefix} ${msg}`);
    } else {
      console.log(`${prefix} ${msg}`);
    }
  };
}

export async function deliverEmail({ templateId, chatId, userId, recipientEmail, emailData, mode = 'now', scheduledAt, senderOverride }) {
  const log = getStageLogger({ templateId });
  const result = {
    success: false, messageId: null, provider: null, status: null,
    delivered: false, sentAt: null, error: null,
  };

  log('Send requested', { mode, to: maskEmail(recipientEmail) });

  // Step 1: Validate pre-send requirements
  const pf = emailData.personalizationFields || emailData;
  const template = emailData;

  const subject = template.subjectLine || template.subject || pf.subject || '';
  let htmlContent = template.emailBodyHtml || template.html || pf.html || '';
  let textContent = template.emailBodyText || template.plainText || pf.plainText || '';

  if (!recipientEmail) {
    result.error = 'recipientEmail is required';
    log('Validation failed', { error: result.error });
    return result;
  }

  const recipientValidation = validateRecipient(recipientEmail);
  if (!recipientValidation.valid) {
    result.error = recipientValidation.reason;
    log('Validation failed', { error: result.error });
    return result;
  }

  if (!subject) {
    result.error = 'Subject is required';
    log('Validation failed', { error: result.error });
    return result;
  }

  // Step 2: Generate HTML if missing
  if (!htmlContent) {
    log('HTML missing — generating from email data');
    htmlContent = generateEmailHtmlTemplate(pf);
    if (!htmlContent) {
      result.error = 'Failed to generate HTML content';
      log('HTML generation failed', { error: result.error });
      return result;
    }
  }

  if (!textContent) {
    textContent = generatePlainTextFromHtml(htmlContent);
  }

  log('Validation passed', { subjectLen: subject.length, htmlLen: htmlContent.length, textLen: textContent.length });

  // Step 3: Verify approval
  if (template.approvalStatus !== 'APPROVED') {
    result.error = 'Template must be approved before sending';
    log('Validation failed', { error: result.error });
    return result;
  }

  // Step 4: Select provider and send
  const providerName = getActiveProvider();
  if (!providerName) {
    result.error = 'No email provider configured';
    log('Provider selected', { error: result.error });
    return result;
  }

  const sender = senderOverride || { name: template.senderName, email: template.senderEmail };

  log(`Provider selected: ${providerName}`, { to: maskEmail(recipientEmail), subject: subject.substring(0, 50) });

  const sendPayload = {
    to: recipientEmail.trim(),
    subject: mode === 'test' ? `[TEST] ${subject}` : subject,
    html: htmlContent,
    text: textContent,
    senderName: sender.name,
    replyTo: template.replyToEmail,
    tags: [mode === 'test' ? 'TEST_EMAIL' : mode === 'schedule' ? 'SCHEDULED' : 'PRODUCTION', template.category || 'email'],
    metadata: { templateId, chatId, userId, mode },
  };

  if (mode === 'schedule' && scheduledAt) {
    sendPayload.scheduledAt = scheduledAt;
  }

  log('Sending...', { provider: providerName });

  let sendResult;
  try {
    sendResult = await sendEmail(sendPayload);
  } catch (err) {
    sendResult = { success: false, error: { code: 'SEND_EXCEPTION', message: err.message } };
  }

  if (sendResult.success) {
    result.success = true;
    result.messageId = sendResult.providerMessageId;
    result.provider = sendResult.provider || providerName;
    result.status = mode === 'schedule' ? 'SCHEDULED' : 'SENT';
    result.delivered = true;
    result.sentAt = sendResult.sentAt || new Date().toISOString();
    log('Provider response', { success: true, messageId: result.messageId, provider: result.provider });
    log('Delivery success', { messageId: result.messageId, to: maskEmail(recipientEmail) });
  } else {
    result.error = sendResult.error?.message || sendResult.error?.code || 'Send failed';
    result.provider = sendResult.provider || providerName;
    result.status = 'FAILED';
    log('Provider response', { success: false, error: result.error });
    log('Delivery failed', { error: result.error, code: sendResult.error?.code });
  }

  // Step 5: Save to database
  try {
    const deliveryStatus = result.success ? (mode === 'schedule' ? 'SCHEDULED' : 'SENT') : 'FAILED';
    const delivery = await prisma.emailDeliveryLog.create({
      data: {
        emailCampaignId: templateId,
        recipientEmail: recipientEmail.trim(),
        provider: result.provider || providerName,
        providerMessageId: result.messageId,
        status: deliveryStatus,
        errorMessage: result.error || null,
        scheduledAt: mode === 'schedule' ? new Date(scheduledAt) : null,
        sentAt: result.sentAt ? new Date(result.sentAt) : new Date(),
      }
    });

    // Log to automation log
    await prisma.automationLog.create({
      data: {
        userId, chatId,
        action: mode === 'test' ? 'email_test_sent' : mode === 'schedule' ? 'email_scheduled' : 'email_sent',
        message: `${mode === 'test' ? 'Test' : mode === 'schedule' ? 'Scheduled' : ''} email ${result.success ? 'sent' : 'failed'} to ${maskEmail(recipientEmail)}`,
        metadata: { templateId, providerMessageId: result.messageId, provider: result.provider, status: deliveryStatus, error: result.error },
      }
    });

    log('Database saved', { deliveryId: delivery.id, status: deliveryStatus });
  } catch (dbErr) {
    console.error(`[Mail] Database save failed:`, dbErr.message);
  }

  return result;
}