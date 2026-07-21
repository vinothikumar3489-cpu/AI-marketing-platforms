import axios from 'axios';
import { PROVIDER_STATUS, maskEmail } from './email-provider.interface.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const BREVO_SCHEDULED_URL = 'https://api.brevo.com/v3/smtp/email/scheduled';
const BREVO_WEBHOOK_URL = 'https://api.brevo.com/v3/webhooks';
const TIMEOUT_MS = 30000;

function getConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.BREVO_SENDER_EMAIL || process.env.BREVO_FROM_EMAIL || '',
    fromName: process.env.BREVO_SENDER_NAME || process.env.BREVO_FROM_NAME || 'AI Marketing Platform',
    replyTo: process.env.BREVO_REPLY_TO_EMAIL || process.env.BREVO_REPLY_TO || '',
    webhookSecret: process.env.BREVO_WEBHOOK_SECRET || '',
    publicUrl: process.env.APP_PUBLIC_URL || '',
  };
}

export function getBrevoHealth() {
  const config = getConfig();
  const configured = !!config.apiKey;
  const senderConfigured = !!config.fromEmail;
  return {
    provider: 'brevo',
    configured,
    senderConfigured,
    replyToConfigured: !!config.replyTo,
    webhookConfigured: !!config.webhookSecret,
    mode: configured ? 'HTTP_API' : 'NOT_CONFIGURED',
    status: configured ? (senderConfigured ? PROVIDER_STATUS.AVAILABLE : PROVIDER_STATUS.SENDER_NOT_CONFIGURED) : PROVIDER_STATUS.NOT_CONFIGURED,
  };
}

/**
 * Send transactional email through Brevo
 * Canonical export: sendViaBrevo
 */
export async function sendTransactionalEmail({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };
  if (!config.fromEmail) return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'BREVO_SENDER_EMAIL is not configured.' } };

  try {
    const payload = {
      sender: { email: config.fromEmail, name: senderName || config.fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      tags: tags || [],
      headers: {
        'X-Idempotency-Key': idempotencyKey || '',
        'X-Provider': 'brevo',
      },
    };

    if (replyTo) payload.replyTo = { email: replyTo };
    if (metadata) payload.headers = { ...payload.headers, ...metadata };

    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT_MS,
    });

    const messageId = response.data?.messageId || 'bv-' + Date.now();
    return {
      success: true,
      provider: 'brevo',
      status: 'QUEUED',
      providerMessageId: messageId,
      maskedRecipient: maskEmail(to),
      sentAt: new Date().toISOString(),
      retryable: false,
    };
  } catch (err) {
    return handleBrevoError(err, to);
  }
}

// Canonical export alias for sendTransactionalEmail
export { sendTransactionalEmail as sendViaBrevo };

/**
 * Send test email through Brevo
 */
export async function sendTestEmail({ to, subject, html, text, senderName, replyTo, tags = ['TEST_EMAIL'] }) {
  const result = await sendTransactionalEmail({
    to,
    subject: `[TEST] ${subject}`,
    html,
    text,
    senderName,
    replyTo,
    tags,
    metadata: { 'X-Email-Type': 'TEST' },
    idempotencyKey: `test-${Date.now()}`
  });

  if (result.success) {
    return {
      ...result,
      testStatus: 'TEST_SENT',
      message: 'Test email sent successfully'
    };
  }

  return result;
}

/**
 * Schedule email through Brevo
 */
export async function scheduleEmail({ to, subject, html, text, senderName, replyTo, scheduledAt, tags, metadata }) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };
  if (!config.fromEmail) return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'BREVO_SENDER_EMAIL is not configured.' } };

  try {
    const payload = {
      sender: { email: config.fromEmail, name: senderName || config.fromName },
      to: [{ email: to }],
      subject,
      htmlContent: html,
      textContent: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
      tags: tags || [],
      scheduledAt: scheduledAt || new Date(Date.now() + 3600000).toISOString(), // Default to 1 hour from now
      headers: {
        'X-Provider': 'brevo',
      },
    };

    if (replyTo) payload.replyTo = { email: replyTo };
    if (metadata) payload.headers = { ...payload.headers, ...metadata };

    const response = await axios.post(BREVO_SCHEDULED_URL, payload, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT_MS,
    });

    const scheduledId = response.data?.scheduledId || response.data?.messageId || 'bv-sched-' + Date.now();
    return {
      success: true,
      provider: 'brevo',
      status: 'SCHEDULED',
      scheduledId,
      scheduledAt,
      maskedRecipient: maskEmail(to),
      createdAt: new Date().toISOString(),
      retryable: false,
    };
  } catch (err) {
    return handleBrevoError(err, to);
  }
}

/**
 * Cancel scheduled email
 */
export async function cancelScheduledEmail(scheduledId) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };

  try {
    await axios.delete(`${BREVO_SCHEDULED_URL}/${scheduledId}`, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT_MS,
    });

    return {
      success: true,
      scheduledId,
      cancelledAt: new Date().toISOString(),
      message: 'Scheduled email cancelled successfully'
    };
  } catch (err) {
    const status = err.response?.status;
    const errorMessage = err.response?.data?.message || err.message || 'Unknown error';

    if (status === 404) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Scheduled email not found or already sent.' } };
    }

    return {
      success: false,
      error: { code: 'CANCEL_FAILED', message: `Failed to cancel scheduled email: ${errorMessage}` }
    };
  }
}

/**
 * Get delivery status for an email
 */
export async function getDeliveryStatus(messageId) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };

  try {
    // Brevo doesn't have a direct delivery status endpoint by messageId
    // This would typically be handled via webhooks
    // For now, return a placeholder response
    return {
      success: true,
      messageId,
      status: 'UNKNOWN',
      message: 'Delivery status tracking requires webhook configuration',
      webhookRequired: true
    };
  } catch (err) {
    return {
      success: false,
      error: { code: 'STATUS_CHECK_FAILED', message: err.message }
    };
  }
}

/**
 * Create webhook for delivery tracking
 */
export async function createWebhook({ url, events, description }) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };

  try {
    const payload = {
      url,
      description: description || 'Email delivery tracking webhook',
      events: events || ['delivered', 'opened', 'click', 'bounce', 'spam', 'blocked', 'invalid_email', 'deferred'],
      headers: {
        'X-Webhook-Secret': config.webhookSecret
      }
    };

    const response = await axios.post(BREVO_WEBHOOK_URL, payload, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT_MS,
    });

    const webhookId = response.data?.id || response.data?.webhookId;
    return {
      success: true,
      webhookId,
      url,
      events: payload.events,
      createdAt: new Date().toISOString()
    };
  } catch (err) {
    return {
      success: false,
      error: { code: 'WEBHOOK_CREATION_FAILED', message: err.response?.data?.message || err.message }
    };
  }
}

/**
 * Handle Brevo API errors
 */
function handleBrevoError(err, to) {
  const status = err.response?.status;
  const errorData = err.response?.data;
  const errorMessage = errorData?.message || err.message || 'Unknown Brevo error';

  if (status === 401 || status === 403) {
    return { success: false, status: PROVIDER_STATUS.AUTH_FAILED, error: { code: 'BREVO_AUTH_FAILED', message: 'Brevo authentication failed. Check BREVO_API_KEY.' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
  }
  if (status === 429) {
    return { success: false, status: PROVIDER_STATUS.RATE_LIMITED, error: { code: 'BREVO_RATE_LIMITED', message: 'Brevo rate limit exceeded. Try again later.' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
  }
  if (status === 400) {
    return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'BREVO_REJECTED', message: `Brevo rejected request: ${errorMessage}` }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
  }
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'BREVO_TIMEOUT', message: 'Brevo request timed out.' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
  }

  return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'BREVO_SEND_FAILED', message: `Brevo send failed: ${errorMessage}` }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: status >= 500 };
}
