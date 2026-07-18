import fetch from 'node-fetch';

const BREVO_API_KEY = process.env.BREVO_API_KEY?.trim();
const BREVO_API_URL = 'https://api.brevo.com/v3';

let _healthCache = null;
let _lastHealthCheck = 0;
const HEALTH_TTL = 60000;

function getAuthHeaders() {
  if (!BREVO_API_KEY) return null;
  return {
    'api-key': BREVO_API_KEY,
    'Content-Type': 'application/json',
    'Accept': 'application/json',
  };
}

async function brevoRequest(method, path, body = null) {
  const headers = getAuthHeaders();
  if (!headers) {
    return { success: false, error: 'Brevo API key not configured', unavailable: true, statusCode: 0 };
  }

  const url = `${BREVO_API_URL}${path}`;
  const options = { method, headers };

  if (body) {
    options.body = JSON.stringify(body);
  }

  try {
    const response = await fetch(url, options);
    const data = response.status !== 204 ? await response.json().catch(() => null) : null;

    if (!response.ok) {
      const msg = data?.message || data?.error || `HTTP ${response.status}`;
      return {
        success: false,
        error: msg,
        statusCode: response.status,
        code: data?.code || null,
      };
    }

    return { success: true, data, statusCode: response.status };
  } catch (err) {
    return { success: false, error: err.message, statusCode: 0 };
  }
}

export async function healthCheck() {
  const now = Date.now();
  if (_healthCache && now - _lastHealthCheck < HEALTH_TTL) {
    return _healthCache;
  }

  const configured = !!BREVO_API_KEY;
  let authenticated = false;
  let accountReachable = false;
  let senderAvailable = false;
  let listAvailable = false;
  let errorCode = null;
  let safeMessage = '';

  if (!configured) {
    const result = {
      configured: false,
      authenticated: false,
      accountReachable: false,
      senderAvailable: false,
      listAvailable: false,
      lastCheckedAt: new Date().toISOString(),
      errorCode: 'NOT_CONFIGURED',
      safeMessage: 'Brevo API key not configured — email sending unavailable',
    };
    _healthCache = result;
    _lastHealthCheck = now;
    return result;
  }

  const accountResult = await brevoRequest('GET', '/account');
  authenticated = accountResult.success;
  accountReachable = accountResult.success;
  errorCode = accountResult.success ? null : (accountResult.statusCode?.toString() || 'UNKNOWN');
  safeMessage = accountResult.success ? '' : (accountResult.error || 'Account unreachable');

  if (accountResult.success) {
    const sendersResult = await brevoRequest('GET', '/senders');
    senderAvailable = sendersResult.success && Array.isArray(sendersResult.data?.senders) && sendersResult.data.senders.length > 0;

    const listsResult = await brevoRequest('GET', '/contacts/lists?limit=10');
    listAvailable = listsResult.success && Array.isArray(listsResult.data?.lists) && listsResult.data.lists.length > 0;
  }

  const result = {
    configured,
    authenticated,
    accountReachable,
    senderAvailable,
    listAvailable,
    lastCheckedAt: new Date().toISOString(),
    errorCode,
    safeMessage,
  };

  _healthCache = result;
  _lastHealthCheck = now;
  return result;
}

export async function getAccount() {
  return brevoRequest('GET', '/account');
}

export async function listSenders() {
  return brevoRequest('GET', '/senders');
}

export async function listContactLists(limit = 50, offset = 0) {
  return brevoRequest('GET', `/contacts/lists?limit=${limit}&offset=${offset}`);
}

export async function createCampaign({ name, subject, htmlContent, plainTextContent, senderId, listIds, scheduledAt = null }) {
  const body = {
    name,
    subject,
    htmlContent,
    plainTextContent: plainTextContent || '',
    senderId,
    listIds: Array.isArray(listIds) ? listIds : [listIds],
    scheduledAt: scheduledAt || undefined,
  };
  return brevoRequest('POST', '/emailCampaigns', body);
}

export async function updateCampaign(campaignId, updates) {
  return brevoRequest('PUT', `/emailCampaigns/${campaignId}`, updates);
}

export async function scheduleCampaign(campaignId, scheduledAt) {
  return brevoRequest('POST', `/emailCampaigns/${campaignId}/schedule`, { scheduledAt });
}

export async function sendCampaignNow(campaignId) {
  return brevoRequest('POST', `/emailCampaigns/${campaignId}/sendNow`);
}

export async function sendTestEmail(campaignId, emailTo) {
  const emails = Array.isArray(emailTo) ? emailTo : [emailTo];
  return brevoRequest('POST', `/emailCampaigns/${campaignId}/sendTest`, { emailTo: emails });
}

const _idempotencyStore = new Map();
const IDEMPOTENCY_TTL = 300000;

function makeIdempotencyKey(assetId, action) {
  return `${assetId}::${action}`;
}

export async function sendTestEmailIdempotent(assetId, campaignId, emailTo, { onDuplicate } = {}) {
  const key = makeIdempotencyKey(assetId, 'sendTest');
  const existing = _idempotencyStore.get(key);
  if (existing && Date.now() - existing.timestamp < IDEMPOTENCY_TTL) {
    if (onDuplicate) onDuplicate(existing);
    return { ...existing, idempotent: true, previousAttempt: existing.timestamp };
  }
  const result = await sendTestEmail(campaignId, emailTo);
  const entry = { ...result, timestamp: Date.now(), assetId, campaignId };
  _idempotencyStore.set(key, entry);
  setTimeout(() => _idempotencyStore.delete(key), IDEMPOTENCY_TTL);
  return { ...entry, idempotent: false };
}

export async function sendCampaignNowIdempotent(assetId, campaignId, { onDuplicate } = {}) {
  const key = makeIdempotencyKey(assetId, 'sendNow');
  const existing = _idempotencyStore.get(key);
  if (existing && Date.now() - existing.timestamp < IDEMPOTENCY_TTL) {
    if (onDuplicate) onDuplicate(existing);
    return { ...existing, idempotent: true, previousAttempt: existing.timestamp };
  }
  const result = await sendCampaignNow(campaignId);
  const entry = { ...result, timestamp: Date.now(), assetId, campaignId };
  _idempotencyStore.set(key, entry);
  setTimeout(() => _idempotencyStore.delete(key), IDEMPOTENCY_TTL);
  return { ...entry, idempotent: false };
}

export async function getCampaignStatus(campaignId) {
  return brevoRequest('GET', `/emailCampaigns/${campaignId}`);
}

export async function createSender({ name, email }) {
  return brevoRequest('POST', '/senders', { name, email });
}

export function isBrevoConfigured() {
  return !!BREVO_API_KEY;
}

export function getBrevoStatus() {
  return {
    configured: isBrevoConfigured(),
    apiKeyPresent: !!BREVO_API_KEY,
    apiKeyPrefix: BREVO_API_KEY ? BREVO_API_KEY.substring(0, 8) + '...' : null,
  };
}

export default {
  healthCheck,
  getAccount,
  listSenders,
  listContactLists,
  createCampaign,
  updateCampaign,
  scheduleCampaign,
  sendCampaignNow,
  sendTestEmail,
  getCampaignStatus,
  createSender,
  isBrevoConfigured,
  getBrevoStatus,
};
