import { sendEmail, getEmailProviderHealth } from './email-provider-registry.js';
import { maskEmail, validateRecipient } from './email-provider.interface.js';

export async function sendTestEmail({ recipientEmail, subject, body, senderName, approvalChecked }) {
  if (!approvalChecked) {
    return { success: false, error: 'Manual approval required. Check the approval checkbox before sending.', code: 'APPROVAL_REQUIRED' };
  }

  const recipientValidation = validateRecipient(recipientEmail);
  if (!recipientValidation.valid) {
    return { success: false, error: recipientValidation.reason, code: 'INVALID_EMAIL' };
  }

  if (!subject || typeof subject !== 'string' || subject.trim().length === 0) {
    return { success: false, error: 'Subject is required', code: 'INVALID_SUBJECT' };
  }
  if (!body || typeof body !== 'string' || body.trim().length === 0) {
    return { success: false, error: 'Email body is required', code: 'INVALID_BODY' };
  }

  const health = getEmailProviderHealth();
  if (!health.canSend) {
    return {
      success: false,
      error: 'No email provider configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL, or configure SMTP_USER/SMTP_PASS for Gmail.',
      code: 'NO_PROVIDER',
      providers: health.providers,
    };
  }

  const result = await sendEmail({
    to: recipientValidation.email,
    subject: subject.trim(),
    html: body.replace(/\n/g, '<br/>'),
    text: body,
    senderName,
    tags: ['test-email'],
  });

  if (result.success) {
    return { success: true, provider: result.provider, messageId: result.providerMessageId, maskedRecipient: result.maskedRecipient, sentAt: result.sentAt };
  }

  return {
    success: false,
    error: `Email sending failed (${result.error?.code || 'UNKNOWN'}): ${result.error?.message || 'Unknown error'}`,
    code: result.error?.code || 'SEND_FAILED',
    provider: result.provider,
  };
}

export async function checkEmailProvider() {
  const health = getEmailProviderHealth();
  const providers = health.providers || {};

  const output = {
    configured: health.canSend,
    provider: health.activeProvider,
    mode: health.mode,
    smtpUserConfigured: !!process.env.SMTP_USER,
    smtpPassConfigured: !!process.env.SMTP_PASS,
    sendgridConfigured: !!process.env.SENDGRID_API_KEY,
    brevoConfigured: !!providers.brevo?.configured,
    resendConfigured: !!process.env.RESEND_API_KEY,
    from: providers.brevo?.senderConfigured ? maskEmail(process.env.BREVO_FROM_EMAIL) : null,
    port587: 'unknown',
    port465: 'unknown',
  };

  if (providers.brevo) {
    output.from = providers.brevo.senderConfigured ? maskEmail(process.env.BREVO_FROM_EMAIL) : null;
  }

  return output;
}
