import { getBrevoHealth, sendViaBrevo } from './brevo.provider.js';
import { getSmtpHealth, sendViaSmtp } from './smtp.provider.js';
import { getSendgridHealth, sendViaSendgrid } from './sendgrid.provider.js';

const PROVIDERS = {};
const SEND_PROVIDER_PREFERENCE = [];

function registerProvider(name, provider) {
  PROVIDERS[name] = provider;
  SEND_PROVIDER_PREFERENCE.push(name);
}

registerProvider('brevo', { send: sendViaBrevo, health: getBrevoHealth });
registerProvider('sendgrid', { send: sendViaSendgrid, health: getSendgridHealth });
registerProvider('smtp', { send: sendViaSmtp, health: getSmtpHealth });

const CIRCUIT_BREAKER_STATE = {};
for (const name of Object.keys(PROVIDERS)) {
  CIRCUIT_BREAKER_STATE[name] = {
    failureCount: 0, lastFailureTime: null, circuitOpen: false,
    circuitOpenUntil: null, threshold: 5, timeout: 60000,
  };
}

export const PROVIDER_STATUS = {
  HEALTHY: 'healthy', DEGRADED: 'degraded', UNHEALTHY: 'unhealthy',
  CIRCUIT_OPEN: 'circuit_open', NOT_CONFIGURED: 'not_configured'
};

let _activeProvider = null;

export function getActiveProvider() {
  if (_activeProvider) return _activeProvider;
  _activeProvider = detectProvider();
  return _activeProvider;
}

export function clearActiveProviderCache() {
  _activeProvider = null;
}

function detectProvider() {
  const envProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();
  if (envProvider && PROVIDERS[envProvider]) {
    const health = PROVIDERS[envProvider].health();
    if (health?.configured && health?.senderConfigured) {
      console.log(`[ProviderRegistry] Detected provider via env: ${envProvider}`);
      return envProvider;
    }
  }
  const configured = SEND_PROVIDER_PREFERENCE.find(p => {
    const health = PROVIDERS[p]?.health();
    return health?.configured && health?.senderConfigured;
  });
  if (configured) {
    console.log(`[ProviderRegistry] Detected configured provider: ${configured}`);
    return configured;
  }
  const anyConfigured = SEND_PROVIDER_PREFERENCE.find(p => {
    const health = PROVIDERS[p]?.health();
    return health?.configured;
  });
  if (anyConfigured) {
    console.log(`[ProviderRegistry] Detected partially configured provider: ${anyConfigured} (no sender email)`);
  } else {
    console.warn(`[ProviderRegistry] No configured provider found`);
  }
  return anyConfigured || null;
}

function classifyProviderStatus(health, circuitState) {
  if (!health?.configured) return PROVIDER_STATUS.NOT_CONFIGURED;
  if (circuitState?.circuitOpen) return PROVIDER_STATUS.CIRCUIT_OPEN;
  if (!health?.senderConfigured) return PROVIDER_STATUS.UNHEALTHY;
  if (health?.mode === 'TEST' || health?.rateLimited) return PROVIDER_STATUS.DEGRADED;
  return PROVIDER_STATUS.HEALTHY;
}

function checkCircuitBreaker(providerName) {
  const state = CIRCUIT_BREAKER_STATE[providerName];
  if (!state) return false;
  if (state.circuitOpen && state.circuitOpenUntil) {
    if (Date.now() > state.circuitOpenUntil) {
      state.circuitOpen = false; state.circuitOpenUntil = null; state.failureCount = 0;
      console.info(`[Circuit Breaker] Reset for provider: ${providerName}`);
      return false;
    }
  }
  return state.circuitOpen;
}

function recordFailure(providerName) {
  const state = CIRCUIT_BREAKER_STATE[providerName];
  if (!state) return;
  state.failureCount++; state.lastFailureTime = Date.now();
  if (state.failureCount >= state.threshold) {
    state.circuitOpen = true; state.circuitOpenUntil = Date.now() + state.timeout;
    console.warn(`[Circuit Breaker] Opened for ${providerName} after ${state.failureCount} failures`);
  }
}

function recordSuccess(providerName) {
  const state = CIRCUIT_BREAKER_STATE[providerName];
  if (!state) return;
  state.failureCount = 0; state.lastFailureTime = null;
}

export function getEmailProviderHealth() {
  const results = {}; const statuses = {};
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const health = provider.health();
    const circuitState = CIRCUIT_BREAKER_STATE[name];
    const status = classifyProviderStatus(health, circuitState);
    results[name] = {
      ...health, status,
      circuitBreaker: { open: circuitState?.circuitOpen || false, failureCount: circuitState?.failureCount || 0, lastFailureTime: circuitState?.lastFailureTime, circuitOpenUntil: circuitState?.circuitOpenUntil }
    };
    statuses[name] = status;
  }
  const active = detectProvider();
  const circuitOpenForActive = active ? checkCircuitBreaker(active) : false;
  return {
    providers: results, providerStatuses: statuses,
    activeProvider: active,
    canSend: !!active && !circuitOpenForActive,
    mode: active && results[active]?.mode ? results[active].mode : 'NONE',
  };
}

export function logActiveProvider() {
  const active = getActiveProvider();
  if (active) {
    const health = PROVIDERS[active]?.health();
    const providerLabel = { brevo: 'Brevo', sendgrid: 'SendGrid', smtp: 'SMTP' }[active] || active;
    console.log(`[Mail Provider] Active: ${providerLabel}`);
    if (health?.mode) console.log(`[Mail Provider] Mode: ${health.mode}`);
    if (health?.configured) {
      console.log(`[Mail Provider] API Key: loaded`);
      if (health?.senderConfigured) console.log(`[Mail Provider] Sender Email: configured`);
    }
  } else {
    console.warn(`[Mail Provider] None configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL, or configure SMTP/SendGrid.`);
  }
}

export async function sendEmail({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  console.log(`[ProviderRegistry] sendEmail() called — to=${to ? maskEmailFromRegistry(to) : '?'}, subject="${(subject || '').substring(0, 40)}"`);

  const providerName = detectProvider();
  if (!providerName) {
    console.error(`[ProviderRegistry] No provider detected — cannot send`);
    return { success: false, provider: null, status: 'NOT_CONFIGURED', error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'No email provider configured.' } };
  }

  console.log(`[ProviderRegistry] Using provider: ${providerName}`);

  if (checkCircuitBreaker(providerName)) {
    console.error(`[ProviderRegistry] Circuit breaker open for ${providerName} — blocking send`);
    return { success: false, provider: providerName, status: 'CIRCUIT_OPEN', error: { code: 'CIRCUIT_BREAKER_OPEN', message: `Provider "${providerName}" circuit is open.` } };
  }

  const provider = PROVIDERS[providerName];
  if (!provider) {
    console.error(`[ProviderRegistry] Provider "${providerName}" not registered`);
    return { success: false, provider: providerName, status: 'NOT_CONFIGURED', error: { code: 'PROVIDER_NOT_CONFIGURED', message: `Provider "${providerName}" not found.` } };
  }

  console.log(`[ProviderRegistry] Delegating to ${providerName}.send()...`);
  const result = await provider.send({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey });
  console.log(`[ProviderRegistry] ${providerName}.send() result:`, JSON.stringify(result));

  if (result.success) {
    recordSuccess(providerName);
    console.log(`[ProviderRegistry] Send succeeded via ${providerName}: messageId=${result.providerMessageId}`);
  } else {
    recordFailure(providerName);
    console.error(`[ProviderRegistry] Send failed via ${providerName}: ${result.error?.code || 'UNKNOWN'} — ${result.error?.message || ''}`);
  }

  return result;
}

function maskEmailFromRegistry(email) {
  if (!email || !email.includes('@')) return email || '?';
  const [name, domain] = email.split('@');
  return name.substring(0, 2) + '***@' + domain;
}
