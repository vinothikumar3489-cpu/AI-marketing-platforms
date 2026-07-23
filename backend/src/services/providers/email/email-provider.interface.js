
export const PROVIDER_STATUS = {
  AVAILABLE: 'AVAILABLE',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
  SENDER_NOT_CONFIGURED: 'SENDER_NOT_CONFIGURED',
  AUTH_FAILED: 'AUTH_FAILED',
  RATE_LIMITED: 'RATE_LIMITED',
  TEMPORARILY_UNAVAILABLE: 'TEMPORARILY_UNAVAILABLE',
};

export function maskEmail(email) {
  if (!email || !email.includes('@')) return email || 'unknown';
  const [local, domain] = email.split('@');
  if (local.length <= 2) return `${local[0]}***@${domain}`;
  return `${local.slice(0, 2)}***${local.slice(-1)}@${domain}`;
}

export function validateRecipient(email) {
  if (!email || typeof email !== 'string') return { valid: false, reason: 'Recipient email is required' };
  const trimmed = email.trim();
  if (trimmed.includes(',') || trimmed.includes(';')) return { valid: false, reason: 'Multiple recipients not supported' };
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(trimmed)) return { valid: false, reason: 'Invalid email format' };
  return { valid: true, email: trimmed };
}
