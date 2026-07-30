import { sendEmail, getActiveProvider } from '../providers/email/email-provider-registry.js';
import { validateRecipient, maskEmail } from '../providers/email/email-provider.interface.js';
import { generateEmailHtmlTemplate } from './email-html-generator.service.js';
import { getEmailQueue } from '../../jobs/queues.js';
import prisma from '../../config/prisma.js';

function sanitizeHtml(html) {
  if (!html) return '';
  return html
    .replace(/<script[\s\S]*?<\/script>/gi, '')
    .replace(/<iframe[\s\S]*?<\/iframe>/gi, '')
    .replace(/<object[\s\S]*?<\/object>/gi, '')
    .replace(/<embed[\s\S]*?<\/embed>/gi, '')
    .replace(/\son\w+="[^"]*"/gi, '')
    .replace(/\son\w+='[^']*'/gi, '')
    .replace(/javascript:\s*/gi, '');
}

function generatePlainTextFromHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').replace(/&nbsp;/g, ' ').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/\s+/g, ' ').trim();
}

export async function deliverEmail({ templateId, chatId, userId, recipientEmail, emailData, mode = 'now', scheduledAt, senderOverride, requestId: rid, useQueue = false }) {
  rid = rid || 'NO_RID';

  // Queue-based delivery when available and requested
  if (useQueue && mode !== 'test') {
    const emailQueue = getEmailQueue();
    if (emailQueue) {
      await emailQueue.add('send-email', { templateId, chatId, userId, recipientEmail, emailData, mode, scheduledAt, senderOverride });
      return { success: true, status: 'QUEUED', message: 'Email queued for delivery', provider: null, messageId: null, delivered: false, sentAt: null, error: null };
    }
  }

  const result = {
    success: false, messageId: null, provider: null, status: null,
    delivered: false, sentAt: null, error: null,
  };

  try {
    const shortId = templateId ? templateId.slice(-8) : 'unknown';
    console.log(`[${rid}] [deliverEmail] STEP 1: Starting — templateId=${shortId}, mode=${mode}, to=${maskEmail(recipientEmail)}`);

    // Step 1: Validate pre-send requirements
    const pf = emailData.personalizationFields || emailData;
    const template = emailData;

    const subject = template.subjectLine || template.subject || pf.subject || pf.headline || template.headline || '';
    let htmlContent = template.emailBodyHtml || template.html || pf.html || '';
    let textContent = template.emailBodyText || template.plainText || pf.plainText || '';

    console.log(`[${rid}] [deliverEmail] STEP 1 EXTRACTED: subject="${(subject || '').substring(0, 50)}", hasHtml=${!!htmlContent}, hasText=${!!textContent}, approvalStatus=${template.approvalStatus}`);

    if (!recipientEmail) {
      result.error = 'recipientEmail is required';
      console.error(`[${rid}] [deliverEmail] STEP 1 FAIL: recipientEmail is required — file=email-delivery.service.js, fn=deliverEmail, line=35`);
      return result;
    }

    const recipientValidation = validateRecipient(recipientEmail);
    if (!recipientValidation.valid) {
      result.error = recipientValidation.reason;
      console.error(`[${rid}] [deliverEmail] STEP 1 FAIL: recipient validation — ${recipientValidation.reason}`);
      return result;
    }
    console.log(`[${rid}] [deliverEmail] STEP 1 PASS: Recipient validated: ${maskEmail(recipientEmail)}`);

    if (!subject) {
      result.error = 'Subject is required';
      console.error(`[${rid}] [deliverEmail] STEP 1 FAIL: Subject is required`);
      return result;
    }
    console.log(`[${rid}] [deliverEmail] STEP 1 PASS: Subject validated: "${subject.substring(0, 50)}"`);

    // Step 2: Generate HTML if missing
    if (!htmlContent) {
      console.log(`[${rid}] [deliverEmail] STEP 2: HTML missing — generating from email data`);
      htmlContent = generateEmailHtmlTemplate(pf);
      if (!htmlContent) {
        result.error = 'Failed to generate HTML content';
        console.error(`[${rid}] [deliverEmail] STEP 2 FAIL: HTML generation returned empty`);
        return result;
      }
      console.log(`[${rid}] [deliverEmail] STEP 2 PASS: HTML generated: ${htmlContent.length} chars`);
    } else {
      console.log(`[${rid}] [deliverEmail] STEP 2 PASS: HTML already present: ${htmlContent.length} chars`);
    }

    if (!textContent) {
      textContent = generatePlainTextFromHtml(htmlContent);
      console.log(`[${rid}] [deliverEmail] STEP 2: Plain text generated from HTML: ${textContent.length} chars`);
    }

    htmlContent = sanitizeHtml(htmlContent);
    console.log(`[${rid}] [deliverEmail] STEP 2: HTML sanitized: ${htmlContent.length} chars`);

    console.log(`[${rid}] [deliverEmail] VALIDATION SUMMARY: subjectLen=${subject.length}, htmlLen=${htmlContent.length}, textLen=${textContent.length}`);

    // Step 3: Verify approval
    if (template.approvalStatus !== 'APPROVED') {
      result.error = `Template must be approved before sending (current: ${template.approvalStatus})`;
      console.error(`[${rid}] [deliverEmail] STEP 3 FAIL: Approval check — current=${template.approvalStatus}, required=APPROVED`);
      console.error(`[${rid}] [deliverEmail] STEP 3 FIX: Call /templates/:id/approve endpoint first`);
      return result;
    }
    console.log(`[${rid}] [deliverEmail] STEP 3 PASS: Approval verified: ${template.approvalStatus}`);

    // Step 4: Select provider
    console.log(`[${rid}] [deliverEmail] STEP 4: Loading provider from registry...`);
    const providerName = getActiveProvider();
    if (!providerName) {
      result.error = 'No email provider configured';
      console.error(`[${rid}] [deliverEmail] STEP 4 FAIL: getActiveProvider() returned null`);
      console.error(`[${rid}] [deliverEmail] STEP 4 FIX: Set BREVO_API_KEY and BREVO_FROM_EMAIL in .env`);
      return result;
    }
    console.log(`[${rid}] [deliverEmail] STEP 4 PASS: Provider = ${providerName}`);

    const sender = senderOverride || { name: template.senderName, email: template.senderEmail };
    console.log(`[${rid}] [deliverEmail] STEP 4 SENDER: name="${sender.name}", email="${sender.email}"`);

    const sendPayload = {
      to: recipientEmail.trim(),
      subject: mode === 'test' ? `[TEST] ${subject}` : subject,
      html: htmlContent,
      text: textContent,
      senderName: sender.name,
      replyTo: template.replyToEmail,
      tags: [mode === 'test' ? 'TEST_EMAIL' : mode === 'schedule' ? 'SCHEDULED' : 'PRODUCTION', template.category || 'email'],
      metadata: { templateId, chatId, userId, mode, requestId: rid },
    };

    if (mode === 'schedule' && scheduledAt) {
      sendPayload.scheduledAt = scheduledAt;
      console.log(`[${rid}] [deliverEmail] STEP 4 SCHEDULE: scheduledAt=${scheduledAt}`);
    }

    console.log(`[${rid}] [deliverEmail] STEP 5: Calling sendEmail() on registry (provider=${providerName})...`);
    console.log(`[${rid}] [deliverEmail] STEP 5 PAYLOAD: to=${maskEmail(sendPayload.to)}, subject="${sendPayload.subject.substring(0, 50)}", htmlLen=${sendPayload.html.length}, textLen=${sendPayload.text.length}`);

    let sendResult;
    try {
      sendResult = await sendEmail(sendPayload);
    } catch (err) {
      console.error(`[${rid}] [deliverEmail] STEP 5 EXCEPTION: sendEmail() threw — ${err.message}`);
      console.error(`[${rid}] [deliverEmail] Stack: ${err.stack}`);
      sendResult = { success: false, error: { code: 'SEND_EXCEPTION', message: err.message } };
    }
    console.log(`[${rid}] [deliverEmail] STEP 5 RESULT: ${JSON.stringify(sendResult)}`);

    if (sendResult.success) {
      result.success = true;
      result.messageId = sendResult.providerMessageId;
      result.provider = sendResult.provider || providerName;
      result.status = mode === 'schedule' ? 'SCHEDULED' : 'SENT';
      result.delivered = true;
      result.sentAt = sendResult.sentAt || new Date().toISOString();
      console.log(`[${rid}] [deliverEmail] STEP 5 PASS: messageId=${result.messageId}, provider=${result.provider}, status=${result.status}`);
    } else {
      result.error = sendResult.error?.message || sendResult.error?.code || 'Send failed';
      result.provider = sendResult.provider || providerName;
      result.status = 'FAILED';
      const errorDetail = sendResult.error?.code ? `${sendResult.error.code}: ${sendResult.error.message}` : JSON.stringify(sendResult.error);
      console.error(`[${rid}] [deliverEmail] STEP 5 FAIL: provider=${result.provider}, error=${errorDetail}`);
    }

    // Step 6: Save to database
    try {
      const deliveryStatus = result.success ? (mode === 'schedule' ? 'SCHEDULED' : 'SENT') : 'FAILED';
      console.log(`[${rid}] [deliverEmail] STEP 6: Storing delivery record — status=${deliveryStatus}`);
      const delivery = await prisma.emailDeliveryLog.create({
        data: {
          recipientEmail: recipientEmail.trim(),
          provider: result.provider || providerName,
          providerMessageId: result.messageId,
          status: deliveryStatus,
          errorMessage: result.error || null,
          sentAt: result.sentAt ? new Date(result.sentAt) : new Date(),
          metadata: { templateId, chatId, userId, mode },
        }
      });
      console.log(`[${rid}] [deliverEmail] STEP 6 PASS: Stored delivery record: id=${delivery.id}`);

      await prisma.automationLog.create({
        data: {
          userId, chatId,
          action: mode === 'test' ? 'email_test_sent' : mode === 'schedule' ? 'email_scheduled' : 'email_sent',
          message: `${mode === 'test' ? 'Test' : mode === 'schedule' ? 'Scheduled' : ''} email ${result.success ? 'sent' : 'failed'} to ${maskEmail(recipientEmail)}`,
          metadata: { templateId, providerMessageId: result.messageId, provider: result.provider, status: deliveryStatus, error: result.error, requestId: rid },
        }
      });
      console.log(`[${rid}] [deliverEmail] STEP 6 PASS: Automation log saved`);
    } catch (dbErr) {
      console.error(`[${rid}] [deliverEmail] STEP 6 FAIL: Database save — ${dbErr.message}`);
      console.error(`[${rid}] [deliverEmail] Stack: ${dbErr.stack}`);
    }

    console.log(`[${rid}] [deliverEmail] FINAL: success=${result.success}, status=${result.status}`);
    return result;

  } catch (err) {
    console.error(`[${rid}] [deliverEmail] UNEXPECTED EXCEPTION: ${err.message}`);
    console.error(`[${rid}] [deliverEmail] Stack: ${err.stack}`);
    result.error = `Unexpected error: ${err.message}`;
    result.status = 'FAILED';
    return result;
  }
}
