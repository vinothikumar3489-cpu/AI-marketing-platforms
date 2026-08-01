import axios from 'axios';
import { PROVIDER_STATUS, maskEmail } from "./email-provider.interface.js";

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

function getRid(metadata) {
  return (metadata && metadata.requestId) || 'NO_RID';
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

export async function sendTransactionalEmail({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  const rid = getRid(metadata);
  const config = getConfig();

  console.log(`[${rid}] [Brevo] STEP 1: sendTransactionalEmail invoked`);
  console.log(`[${rid}] [Brevo] STEP 1 CONFIG: fromEmail=${config.fromEmail}, fromName=${config.fromName}, apiKey=${config.apiKey ? config.apiKey.substring(0, 8) + '...' + ' (' + config.apiKey.length + ' chars)' : 'MISSING'}`);

  if (!config.apiKey) {
    console.error(`[${rid}] [Brevo] STEP 1 FAIL: BREVO_API_KEY is not configured`);
    console.error(`[${rid}] [Brevo] FIX: Set BREVO_API_KEY in .env`);
    return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };
  }
  console.log(`[${rid}] [Brevo] STEP 1 PASS: API key present`);

  if (!config.fromEmail) {
    console.error(`[${rid}] [Brevo] STEP 1 FAIL: BREVO_SENDER_EMAIL is not configured`);
    console.error(`[${rid}] [Brevo] FIX: Set BREVO_SENDER_EMAIL or BREVO_FROM_EMAIL in .env`);
    return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'BREVO_SENDER_EMAIL is not configured.' } };
  }
  console.log(`[${rid}] [Brevo] STEP 1 PASS: Sender email configured: ${config.fromEmail}`);

  console.log(`[${rid}] [Brevo] STEP 2: Building payload`);
  const safeSenderName = senderName || config.fromName;
  const payload = {
    sender: { email: config.fromEmail, name: safeSenderName },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    tags: tags || [],
    headers: {
      'X-Idempotency-Key': idempotencyKey || '',
      'X-Provider': 'brevo',
      'X-Request-Id': rid,
    },
  };

  if (replyTo) payload.replyTo = { email: replyTo };
  if (metadata) payload.headers = { ...payload.headers, ...metadata };

  console.log(`[${rid}] [Brevo] STEP 2 PAYLOAD (safe):`);
  console.log(`[${rid}] [Brevo]   sender: ${JSON.stringify(payload.sender)}`);
  console.log(`[${rid}] [Brevo]   to: ${to}`);
  console.log(`[${rid}] [Brevo]   subject: "${(subject || '').substring(0, 80)}"`);
  console.log(`[${rid}] [Brevo]   htmlContent length: ${(html || '').length} chars`);
  console.log(`[${rid}] [Brevo]   textContent length: ${(text || '').length || ((html || '').replace(/<[^>]*>/g, '').length)} chars`);
  console.log(`[${rid}] [Brevo]   tags: ${JSON.stringify(tags || [])}`);
  console.log(`[${rid}] [Brevo]   headers (without metadata): ${JSON.stringify({ 'X-Provider': 'brevo', 'X-Request-Id': rid, 'X-Idempotency-Key': (idempotencyKey || '').substring(0, 20) })}`);

  console.log(`[${rid}] [Brevo] STEP 3: Sending HTTP POST to ${BREVO_API_URL}`);
  try {
    const response = await axios.post(BREVO_API_URL, payload, {
      headers: {
        'api-key': config.apiKey,
        'Content-Type': 'application/json',
      },
      timeout: TIMEOUT_MS,
    });

    console.log(`[${rid}] [Brevo] STEP 3 RESPONSE: status=${response.status}, statusText=${response.statusText}`);
    console.log(`[${rid}] [Brevo] STEP 3 RESPONSE BODY: ${JSON.stringify(response.data)}`);

    const messageId = response.data?.messageId || 'bv-' + Date.now();
    console.log(`[${rid}] [Brevo] STEP 3 PASS: HTTP ${response.status}, messageId=${messageId}`);
    console.log(`[${rid}] [Brevo] Accepted`);

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
    const status = err.response?.status;
    const errorData = err.response?.data;
    const errorMessage = errorData?.message || err.message || 'Unknown Brevo error';

    console.log(`[${rid}] [Brevo] STEP 3 FAIL: HTTP ${status || 'NO_RESPONSE'}`);
    console.log(`[${rid}] [Brevo] STEP 3 ERROR BODY: ${JSON.stringify(errorData)}`);
    console.log(`[${rid}] [Brevo] STEP 3 ERROR MESSAGE: ${errorMessage}`);

    if (status === 401 || status === 403) {
      console.error(`[${rid}] [Brevo] AUTH FAILURE — API key rejected or IP not whitelisted`);
      console.error(`[${rid}] [Brevo] FIX: 1) Check BREVO_API_KEY is valid 2) Add current IP to https://app.brevo.com/security/authorised_ips`);
    }
    if (status === 429) {
      console.error(`[${rid}] [Brevo] RATE LIMITED`);
    }

    console.error(`[${rid}] [Brevo] Error stack: ${err.stack}`);
    return handleBrevoError(err, to, rid);
  }
}

export const sendViaBrevo = sendTransactionalEmail;

export async function sendTestEmail({ to, subject, html, text, senderName, replyTo, tags = ['TEST_EMAIL'] }) {
  const rid = getRid({ requestId: 'test-' + Date.now() });
  console.log(`[${rid}] [Brevo] sendTestEmail to=${to}`);
  const result = await sendTransactionalEmail({
    to,
    subject: `[TEST] ${subject}`,
    html,
    text,
    senderName,
    replyTo,
    tags,
    metadata: { 'X-Email-Type': 'TEST', requestId: rid },
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

export async function scheduleEmail({ to, subject, html, text, senderName, replyTo, scheduledAt, tags, metadata }) {
  const rid = getRid(metadata);
  const config = getConfig();
  console.log(`[${rid}] [Brevo] Schedule email — to=${to}, at=${scheduledAt}`);
  if (!config.apiKey) return { success: false, status: PROVIDER_STATUS.NOT_CONFIGURED, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };
  if (!config.fromEmail) return { success: false, status: PROVIDER_STATUS.SENDER_NOT_CONFIGURED, error: { code: 'SENDER_NOT_CONFIGURED', message: 'BREVO_SENDER_EMAIL is not configured.' } };

  const payload = {
    sender: { email: config.fromEmail, name: senderName || config.fromName },
    to: [{ email: to }],
    subject,
    htmlContent: html,
    textContent: text || html.replace(/<[^>]*>/g, '').replace(/\s+/g, ' ').trim(),
    tags: tags || [],
    scheduledAt: scheduledAt || new Date(Date.now() + 3600000).toISOString(),
    headers: { 'X-Provider': 'brevo', 'X-Request-Id': rid },
  };

  if (replyTo) payload.replyTo = { email: replyTo };
  if (metadata) payload.headers = { ...payload.headers, ...metadata };

  console.log(`[${rid}] [Brevo] Sending schedule request...`);
  try {
    const response = await axios.post(BREVO_SCHEDULED_URL, payload, {
      headers: { 'api-key': config.apiKey, 'Content-Type': 'application/json' },
      timeout: TIMEOUT_MS,
    });
    console.log(`[${rid}] [Brevo] Schedule API response: ${JSON.stringify(response.data)}`);

    const scheduledId = response.data?.scheduledId || response.data?.messageId || 'bv-sched-' + Date.now();
    return {
      success: true, provider: 'brevo', status: 'SCHEDULED', scheduledId, scheduledAt,
      maskedRecipient: maskEmail(to), createdAt: new Date().toISOString(), retryable: false,
    };
  } catch (err) {
    console.log(`[${rid}] [Brevo] Schedule API Error`);
    return handleBrevoError(err, to, rid);
  }
}

export async function cancelScheduledEmail(scheduledId) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };

  console.log(`[Brevo] Cancelling scheduled email: ${scheduledId}`);
  try {
    await axios.delete(`${BREVO_SCHEDULED_URL}/${scheduledId}`, {
      headers: { 'api-key': config.apiKey, 'Content-Type': 'application/json' },
      timeout: TIMEOUT_MS,
    });
    return { success: true, scheduledId, cancelledAt: new Date().toISOString(), message: 'Scheduled email cancelled successfully' };
  } catch (err) {
    const status = err.response?.status;
    const responseBody = err.response?.data;
    const errorMessage = responseBody?.message || err.message || 'Unknown error';
    console.error(`[Brevo] Cancel failed: status=${status}, body=${JSON.stringify(responseBody)}`);

    if (status === 404) {
      return { success: false, error: { code: 'NOT_FOUND', message: 'Scheduled email not found or already sent.' } };
    }

    return { success: false, error: { code: 'CANCEL_FAILED', message: `Failed to cancel scheduled email: ${errorMessage}` } };
  }
}

export async function getDeliveryStatus(messageId) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };

  try {
    return { success: true, messageId, status: 'UNKNOWN', message: 'Delivery status tracking requires webhook configuration', webhookRequired: true };
  } catch (err) {
    return { success: false, error: { code: 'STATUS_CHECK_FAILED', message: err.message } };
  }
}

export async function createWebhook({ url, events, description }) {
  const config = getConfig();
  if (!config.apiKey) return { success: false, error: { code: 'BREVO_NOT_CONFIGURED', message: 'BREVO_API_KEY is not configured.' } };

  try {
    const payload = {
      url,
      description: description || 'Email delivery tracking webhook',
      events: events || ['delivered', 'opened', 'click', 'bounce', 'spam', 'blocked', 'invalid_email', 'deferred'],
      headers: { 'X-Webhook-Secret': config.webhookSecret }
    };

    const response = await axios.post(BREVO_WEBHOOK_URL, payload, {
      headers: { 'api-key': config.apiKey, 'Content-Type': 'application/json' },
      timeout: TIMEOUT_MS,
    });

    const webhookId = response.data?.id || response.data?.webhookId;
    return { success: true, webhookId, url, events: payload.events, createdAt: new Date().toISOString() };
  } catch (err) {
    console.error(`[Brevo] Webhook creation failed:`, err.response?.data || err.message);
    return { success: false, error: { code: 'WEBHOOK_CREATION_FAILED', message: err.response?.data?.message || err.message } };
  }
}

function handleBrevoError(err, to, rid) {
  rid = rid || 'NO_RID';
  const status = err.response?.status;
  const errorData = err.response?.data;
  const responseHeaders = err.response?.headers;
  const errorMessage = errorData?.message || err.message || 'Unknown Brevo error';

  console.error(`[${rid}] [Brevo] ERROR — status=${status}, message="${errorMessage}"`);
  console.error(`[${rid}] [Brevo] Full error response body: ${JSON.stringify(errorData)}`);
  console.error(`[${rid}] [Brevo] Error stack: ${err.stack}`);

  if (status === 401 || status === 403) {
    console.error(`[${rid}] [Brevo] AUTH BLOCKED — file=brevo.provider.js, fn=handleBrevoError, line=242`);
    console.error(`[${rid}] [Brevo] CONDITION: Brevo returned HTTP ${status}`);
    console.error(`[${rid}] [Brevo] ROOT CAUSE: API key rejection OR IP not whitelisted`);
    console.error(`[${rid}] [Brevo] FIX: 1) Verify BREVO_API_KEY is correct 2) Add IP to https://app.brevo.com/security/authorised_ips`);
    return { success: false, status: PROVIDER_STATUS.AUTH_FAILED, error: { code: 'BREVO_AUTH_FAILED', message: `Brevo authentication failed: ${errorMessage}` }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
  }
  if (status === 429) {
    console.error(`[${rid}] [Brevo] RATE LIMITED`);
    return { success: false, status: PROVIDER_STATUS.RATE_LIMITED, error: { code: 'BREVO_RATE_LIMITED', message: `Brevo rate limit exceeded: ${errorMessage}` }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
  }
  if (status === 400) {
    console.error(`[${rid}] [Brevo] BAD REQUEST: ${JSON.stringify(errorData)}`);
    return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'BREVO_REJECTED', message: `Brevo rejected request: ${errorMessage}` }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: false };
  }
  if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
    console.error(`[${rid}] [Brevo] TIMEOUT`);
    return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'BREVO_TIMEOUT', message: 'Brevo request timed out.' }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: true };
  }

  console.error(`[${rid}] [Brevo] UNHANDLED ERROR: ${err.message}`, err.stack);
  return { success: false, status: PROVIDER_STATUS.TEMPORARILY_UNAVAILABLE, error: { code: 'BREVO_SEND_FAILED', message: `Brevo send failed: ${errorMessage}` }, providerMessageId: null, maskedRecipient: maskEmail(to), sentAt: new Date().toISOString(), retryable: status >= 500 };
}
