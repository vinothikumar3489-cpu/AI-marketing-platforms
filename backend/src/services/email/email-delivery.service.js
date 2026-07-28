import { sendEmail, getActiveProvider } from '../providers/email/email-provider-registry.js';
import { validateRecipient, maskEmail } from '../providers/email/email-provider.interface.js';
import { generateEmailHtmlTemplate } from './email-html-generator.service.js';
import prisma from '../../config/prisma.js';

function generatePlainTextFromHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

export async function deliverEmail({ templateId, chatId, userId, recipientEmail, emailData, mode = 'now', scheduledAt, senderOverride }) {
  const result = {
    success: false, messageId: null, provider: null, status: null,
    delivered: false, sentAt: null, error: null,
  };

  try {
    const shortId = templateId ? templateId.slice(-8) : 'unknown';
    console.log(`[Email] Preparing email — templateId=${shortId}, mode=${mode}, to=${maskEmail(recipientEmail)}`);

    // Step 1: Validate pre-send requirements
    const pf = emailData.personalizationFields || emailData;
    const template = emailData;

    const subject = template.subjectLine || template.subject || pf.subject || '';
    let htmlContent = template.emailBodyHtml || template.html || pf.html || '';
    let textContent = template.emailBodyText || template.plainText || pf.plainText || '';

    console.log(`[Email] Extracted fields — subject="${(subject || '').substring(0, 50)}", hasHtml=${!!htmlContent}, hasText=${!!textContent}, approvalStatus=${template.approvalStatus}`);

    if (!recipientEmail) {
      result.error = 'recipientEmail is required';
      console.error(`[Email] Validation failed: recipientEmail is required`);
      return result;
    }

    const recipientValidation = validateRecipient(recipientEmail);
    if (!recipientValidation.valid) {
      result.error = recipientValidation.reason;
      console.error(`[Email] Validation failed: ${recipientValidation.reason}`);
      return result;
    }
    console.log(`[Email] Recipient validated: ${maskEmail(recipientEmail)}`);

    if (!subject) {
      result.error = 'Subject is required';
      console.error(`[Email] Validation failed: Subject is required`);
      return result;
    }
    console.log(`[Email] Subject validated: "${subject.substring(0, 50)}"`);

    // Step 2: Generate HTML if missing
    if (!htmlContent) {
      console.log(`[Email] HTML missing — generating from email data`);
      htmlContent = generateEmailHtmlTemplate(pf);
      if (!htmlContent) {
        result.error = 'Failed to generate HTML content';
        console.error(`[Email] HTML generation failed`);
        return result;
      }
      console.log(`[Email] HTML generated: ${htmlContent.length} chars`);
    }

    if (!textContent) {
      textContent = generatePlainTextFromHtml(htmlContent);
      console.log(`[Email] Plain text generated from HTML: ${textContent.length} chars`);
    }

    console.log(`[Email] Validation passed — subjectLen=${subject.length}, htmlLen=${htmlContent.length}, textLen=${textContent.length}`);

    // Step 3: Verify approval
    if (template.approvalStatus !== 'APPROVED') {
      result.error = 'Template must be approved before sending';
      console.error(`[Email] Approval check failed: current=${template.approvalStatus}, required=APPROVED`);
      return result;
    }
    console.log(`[Email] Approval verified: ${template.approvalStatus}`);

    // Step 4: Select provider
    console.log(`[Email] Loading provider from registry...`);
    const providerName = getActiveProvider();
    if (!providerName) {
      result.error = 'No email provider configured';
      console.error(`[Email] No provider returned from getActiveProvider()`);
      return result;
    }
    console.log(`[Email] Provider = ${providerName}`);

    const sender = senderOverride || { name: template.senderName, email: template.senderEmail };
    console.log(`[Email] Sender: name="${sender.name}", email="${sender.email}"`);

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
      console.log(`[Email] Scheduling: scheduledAt=${scheduledAt}`);
    }

    console.log(`[Email] Calling sendEmail() on registry (provider=${providerName})...`);
    let sendResult;
    try {
      sendResult = await sendEmail(sendPayload);
    } catch (err) {
      console.error(`[Email] sendEmail() threw exception:`, err.message, err.stack);
      sendResult = { success: false, error: { code: 'SEND_EXCEPTION', message: err.message } };
    }
    console.log(`[Email] sendEmail() returned:`, JSON.stringify(sendResult));

    if (sendResult.success) {
      result.success = true;
      result.messageId = sendResult.providerMessageId;
      result.provider = sendResult.provider || providerName;
      result.status = mode === 'schedule' ? 'SCHEDULED' : 'SENT';
      result.delivered = true;
      result.sentAt = sendResult.sentAt || new Date().toISOString();
      console.log(`[Email] Delivery success — messageId=${result.messageId}, provider=${result.provider}, status=${result.status}`);
    } else {
      result.error = sendResult.error?.message || sendResult.error?.code || 'Send failed';
      result.provider = sendResult.provider || providerName;
      result.status = 'FAILED';
      const errorDetail = sendResult.error?.code ? `${sendResult.error.code}: ${sendResult.error.message}` : JSON.stringify(sendResult.error);
      console.error(`[Email] Delivery failed — provider=${result.provider}, error=${errorDetail}`);
    }

    // Step 5: Save to database
    try {
      const deliveryStatus = result.success ? (mode === 'schedule' ? 'SCHEDULED' : 'SENT') : 'FAILED';
      console.log(`[Email] Storing delivery record — status=${deliveryStatus}`);
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
      console.log(`[Email] Stored delivery record: id=${delivery.id}, status=${deliveryStatus}`);

      await prisma.automationLog.create({
        data: {
          userId, chatId,
          action: mode === 'test' ? 'email_test_sent' : mode === 'schedule' ? 'email_scheduled' : 'email_sent',
          message: `${mode === 'test' ? 'Test' : mode === 'schedule' ? 'Scheduled' : ''} email ${result.success ? 'sent' : 'failed'} to ${maskEmail(recipientEmail)}`,
          metadata: { templateId, providerMessageId: result.messageId, provider: result.provider, status: deliveryStatus, error: result.error },
        }
      });
      console.log(`[Email] Automation log saved`);
    } catch (dbErr) {
      console.error(`[Email] Database save failed:`, dbErr.message, dbErr.stack);
    }

    console.log(`[Email] Completed — success=${result.success}, status=${result.status}`);
    return result;

  } catch (err) {
    console.error(`[Email] Unexpected exception:`, err.message, err.stack);
    result.error = `Unexpected error: ${err.message}`;
    result.status = 'FAILED';
    return result;
  }
}