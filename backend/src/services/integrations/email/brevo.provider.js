import axios from 'axios';
import { PROVIDER_STATUS, maskEmail } from './email-provider.interface.js';

const BREVO_API_URL = 'https://api.brevo.com/v3/smtp/email';
const TIMEOUT_MS = 30000;

function getConfig() {
  return {
    apiKey: process.env.BREVO_API_KEY || '',
    fromEmail: process.env.BREVO_FROM_EMAIL || '',
    fromName: process.env.BREVO_FROM_NAME || 'AI Marketing Platform',
    replyTo: process.env.BREVO_REPLY_TO || '',
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
    mode: configured ? 'HTTP_API' : 'NOT_CONFIGURED',
    status: configured ? (senderConfigured ? PROVIDER_STATUS.AVAILABLE : PROVIDER_STATUS.SENDER_NOT_CONFIGURED) : PROVIDER_STATUS.NOT_CONFIGURED,
  };
}

export async function sendViaBrevo({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };
  if (!config.fromEmail) return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'BREVO_FROM_EMAIL is not configured. Verify a sender in Brevo and add BREVO_FROM_EMAIL.' } };

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
      status: 'submitted',
      providerMessageId: messageId,
      maskedRecipient: maskEmail(to),
      sentAt: new Date().toISOString(),
      retryable: false,
    };
  } catch (err) {
    const status = err.response?.status;
    const errorData = err.response?.data;
    const errorMessage = errorData?.message || err.message || 'Unknown Brevo error';

    if (status === 401 || status === 403) {
      return { success: false, status: PROVIDER_STATUS.AUTH_FAILED, error: { code: 'AUTH_FAILED', message: 'Brevo authentication failed. Check BREVO_API_KEY.', provider: 'brevo', stage: 'delivery' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
    }
    if (status === 429) {
      return { success: false, status: PROVIDER_STATUS.RATE_LIMITED, error: { code: 'RATE_LIMITED', message: 'Brevo rate limit exceeded. Try again later.', provider: 'brevo', stage: 'delivery' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
    }
    if (status === 400) {
      return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'PROVIDER_REJECTED', message: `Brevo rejected request: ${errorMessage}`, provider: 'brevo', stage: 'delivery' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
    }
    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'PROVIDER_TIMEOUT', message: 'Brevo request timed out.', provider: 'brevo', stage: 'delivery' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
    }

    return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'SEND_FAILED', message: `Brevo send failed: ${errorMessage}`, provider: 'brevo', stage: 'delivery' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: status >= 500 };
  }
}
