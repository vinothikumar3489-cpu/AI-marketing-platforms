import { PROVIDER_STATUS, maskEmail } from "./email-provider.interface.js";

function getConfig() {
  return {
    apiKey: process.env.SENDGRID_API_KEY || '',
    fromEmail: process.env.SENDGRID_FROM_EMAIL || '',
    fromName: process.env.SENDGRID_FROM_NAME || 'AI Marketing Platform',
    replyTo: process.env.SENDGRID_REPLY_TO || '',
  };
}

let sgClient = null;

async function getSendgrid() {
  if (sgClient) return sgClient;
  const sgMail = await import('@sendgrid/mail');
  sgClient = sgMail.default;
  sgClient.setApiKey(getConfig().apiKey);
  return sgClient;
}

export function getSendgridHealth() {
  const config = getConfig();
  const configured = !!config.apiKey;
  const senderConfigured = !!config.fromEmail;
  return {
    provider: 'sendgrid',
    configured,
    senderConfigured,
    replyToConfigured: !!config.replyTo,
    mode: configured ? 'HTTP_API' : 'NOT_CONFIGURED',
    status: configured ? (senderConfigured ? PROVIDER_STATUS.AVAILABLE : PROVIDER_STATUS.SENDER_NOT_CONFIGURED) : PROVIDER_STATUS.NOT_CONFIGURED,
  };
}

export async function sendViaSendgrid({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'SENDGRID_NOT_CONFIGURED', message: 'SENDGRID_API_KEY is not configured.' } };
  if (!config.fromEmail) return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'SENDGRID_FROM_EMAIL is not configured.' } };

  try {
    const sg = await getSendgrid();

    const payload = {
      to,
      from: senderName ? { email: config.fromEmail, name: senderName } : { email: config.fromEmail, name: config.fromName },
      subject,
      html,
      text: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      headers: {
        'X-Idempotency-Key': idempotencyKey || '',
        'X-Provider': 'sendgrid',
      },
    };

    if (replyTo) payload.replyTo = replyTo;
    if (tags && tags.length > 0) {
      payload.categories = tags;
      payload.asm = { groupId: 1 };
    }
    if (metadata) {
      payload.customArgs = { ...metadata };
    }

    const [response] = await sg.send(payload);

    const messageId = response.headers?.['x-message-id'] || 'sg-' + Date.now();
    return {
      success: true,
      provider: 'sendgrid',
      status: 'QUEUED',
      providerMessageId: messageId,
      maskedRecipient: maskEmail(to),
      sentAt: new Date().toISOString(),
      retryable: false,
    };
  } catch (err) {
    console.error(`[SendGrid] Send error:`, err.message);
    const statusCode = err.code || err.status;
    if (statusCode === 401 || statusCode === 403) {
      return { success: false, provider: 'sendgrid', status: PROVIDER_STATUS.AUTH_FAILED, error: { code: 'SENDGRID_AUTH_FAILED', message: 'SendGrid authentication failed. Check SENDGRID_API_KEY.' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
    }
    if (statusCode === 429) {
      return { success: false, provider: 'sendgrid', status: PROVIDER_STATUS.RATE_LIMITED, error: { code: 'SENDGRID_RATE_LIMITED', message: 'SendGrid rate limit exceeded.' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
    }
    return { success: false, provider: 'sendgrid', status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'SENDGRID_SEND_FAILED', message: err.message }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: err.message?.includes('timeout') };
  }
}

export async function sendTestEmailSendgrid({ to, subject, html, text, senderName, replyTo }) {
  const result = await sendViaSendgrid({
    to,
    subject: `[TEST] ${subject}`,
    html,
    text,
    senderName,
    replyTo,
    tags: ['TEST_EMAIL'],
    idempotencyKey: `test-${Date.now()}`,
  });

  if (result.success) {
    return { ...result, testStatus: 'TEST_SENT', message: 'Test email sent successfully' };
  }
  return result;
}

export async function verifySendgridConnection() {
  try {
    const sg = await getSendgrid();
    const [response] = await sg.send({
      to: 'test@example.com',
      from: getConfig().fromEmail,
      subject: 'Verification',
      html: '<p>Verification</p>',
      mailSettings: { sandboxMode: { enable: true } },
    });
    return { success: true, message: 'SendGrid connection verified' };
  } catch (err) {
    if (err.message?.includes('sandbox')) {
      return { success: true, message: 'SendGrid connection verified (sandbox mode)' };
    }
    return { success: false, error: err.message };
  }
}
