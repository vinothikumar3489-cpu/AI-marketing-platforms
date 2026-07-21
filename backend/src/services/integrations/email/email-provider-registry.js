import { getBrevoHealth, sendViaBrevo } from './brevo.provider.js';

const PROVIDERS = {
  brevo: { send: sendViaBrevo, health: getBrevoHealth },
};

const SEND_PROVIDER_PREFERENCE = ['brevo'];

// PART 13: Circuit breaker state tracking
const CIRCUIT_BREAKER_STATE = {
  brevo: {
    failureCount: 0,
    lastFailureTime: null,
    circuitOpen: false,
    circuitOpenUntil: null,
    threshold: 5, // Open circuit after 5 consecutive failures
    timeout: 60000, // Keep circuit open for 60 seconds
  }
};

// PART 13: Provider status classification
export const PROVIDER_STATUS = {
  HEALTHY: 'healthy',
  DEGRADED: 'degraded',
  UNHEALTHY: 'unhealthy',
  CIRCUIT_OPEN: 'circuit_open',
  NOT_CONFIGURED: 'not_configured'
};

function detectProvider() {
  const envProvider = (process.env.EMAIL_PROVIDER || '').toLowerCase().trim();
  if (envProvider && PROVIDERS[envProvider]) {
    const health = PROVIDERS[envProvider].health();
    if (health?.configured && health?.senderConfigured) {
      return envProvider;
    }
  }
  const configured = SEND_PROVIDER_PREFERENCE.find(p => {
    const health = PROVIDERS[p]?.health();
    return health?.configured && health?.senderConfigured;
  });
  if (configured) return configured;
  const anyConfigured = SEND_PROVIDER_PREFERENCE.find(p => {
    const health = PROVIDERS[p]?.health();
    return health?.configured;
  });
  return anyConfigured || null;
}

// PART 13: Classify provider health status
function classifyProviderStatus(health, circuitState) {
  if (!health?.configured) {
    return PROVIDER_STATUS.NOT_CONFIGURED;
  }
  
  if (circuitState?.circuitOpen) {
    return PROVIDER_STATUS.CIRCUIT_OPEN;
  }
  
  if (!health?.senderConfigured) {
    return PROVIDER_STATUS.UNHEALTHY;
  }
  
  if (health?.mode === 'TEST' || health?.rateLimited) {
    return PROVIDER_STATUS.DEGRADED;
  }
  
  return PROVIDER_STATUS.HEALTHY;
}

// PART 13: Check and update circuit breaker state
function checkCircuitBreaker(providerName) {
  const state = CIRCUIT_BREAKER_STATE[providerName];
  if (!state) return false;
  
  // Check if circuit should be reset
  if (state.circuitOpen && state.circuitOpenUntil) {
    if (Date.now() > state.circuitOpenUntil) {
      // Reset circuit breaker
      state.circuitOpen = false;
      state.circuitOpenUntil = null;
      state.failureCount = 0;
      console.info(`[Circuit Breaker] Circuit reset for provider: ${providerName}`);
      return false;
    }
  }
  
  return state.circuitOpen;
}

// PART 13: Record failure and potentially open circuit
function recordFailure(providerName) {
  const state = CIRCUIT_BREAKER_STATE[providerName];
  if (!state) return;
  
  state.failureCount++;
  state.lastFailureTime = Date.now();
  
  if (state.failureCount >= state.threshold) {
    state.circuitOpen = true;
    state.circuitOpenUntil = Date.now() + state.timeout;
    console.warn(`[Circuit Breaker] Circuit opened for provider: ${providerName} after ${state.failureCount} failures`);
  }
}

// PART 13: Record success and reset failure count
function recordSuccess(providerName) {
  const state = CIRCUIT_BREAKER_STATE[providerName];
  if (!state) return;
  
  state.failureCount = 0;
  state.lastFailureTime = null;
}

export function getEmailProviderHealth() {
  const results = {};
  const statuses = {};
  
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    const health = provider.health();
    const circuitState = CIRCUIT_BREAKER_STATE[name];
    const status = classifyProviderStatus(health, circuitState);
    
    results[name] = {
      ...health,
      status,
      circuitBreaker: {
        open: circuitState?.circuitOpen || false,
        failureCount: circuitState?.failureCount || 0,
        lastFailureTime: circuitState?.lastFailureTime,
        circuitOpenUntil: circuitState?.circuitOpenUntil
      }
    };
    statuses[name] = status;
  }
  
  const active = detectProvider();
  const circuitOpenForActive = active ? checkCircuitBreaker(active) : false;
  
  return {
    providers: results,
    providerStatuses: statuses,
    activeProvider: active,
    canSend: !!active && !circuitOpenForActive,
    mode: active && results[active]?.mode ? results[active].mode : 'NONE',
  };
}

export async function sendEmail({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey }) {
  const providerName = detectProvider();
  if (!providerName) {
    return {
      success: false,
      provider: null,
      status: 'NOT_CONFIGURED',
      error: { code: 'PROVIDER_NOT_CONFIGURED', message: 'No email provider configured. Set BREVO_API_KEY and BREVO_FROM_EMAIL.' },
    };
  }

  // PART 13: Check circuit breaker before sending
  if (checkCircuitBreaker(providerName)) {
    return {
      success: false,
      provider: providerName,
      status: 'CIRCUIT_OPEN',
      error: { 
        code: 'CIRCUIT_BREAKER_OPEN', 
        message: `Provider "${providerName}" circuit is open due to repeated failures. Retry after ${CIRCUIT_BREAKER_STATE[providerName].circuitOpenUntil ? new Date(CIRCUIT_BREAKER_STATE[providerName].circuitOpenUntil).toISOString() : 'timeout'}.` 
      },
    };
  }

  const provider = PROVIDERS[providerName];
  if (!provider) {
    return {
      success: false,
      provider: providerName,
      status: 'NOT_CONFIGURED',
      error: { code: 'PROVIDER_NOT_CONFIGURED', message: `Provider "${providerName}" not found in registry.` },
    };
  }

  const result = await provider.send({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey });
  
  // PART 13: Update circuit breaker state based on result
  if (result.success) {
    recordSuccess(providerName);
  } else {
    recordFailure(providerName);
  }
  
  return result;
}
