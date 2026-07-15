import { getBrevoHealth, sendViaBrevo } from './brevo.provider.js';

const PROVIDERS = {
  brevo: { send: sendViaBrevo, health: getBrevoHealth },
};

const SEND_PROVIDER_PREFERENCE = ['brevo'];

function detectProvider() {
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

export function getEmailProviderHealth() {
  const results = {};
  for (const [name, provider] of Object.entries(PROVIDERS)) {
    results[name] = provider.health();
  }
  const active = detectProvider();
  return {
    providers: results,
    activeProvider: active,
    canSend: !!active,
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

  const provider = PROVIDERS[providerName];
  if (!provider) {
    return {
      success: false,
      provider: providerName,
      status: 'NOT_CONFIGURED',
      error: { code: 'PROVIDER_NOT_CONFIGURED', message: `Provider "${providerName}" not found in registry.` },
    };
  }

  return provider.send({ to, subject, html, text, senderName, replyTo, tags, metadata, idempotencyKey });
}
