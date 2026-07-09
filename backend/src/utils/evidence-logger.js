const LOG_PREFIX = '[Evidence]';

export function logEvidenceError(source, url, error, context = {}) {
  const entry = {
    source,
    url,
    error: error?.message || error || 'Unknown error',
    userId: context.userId || null,
    chatId: context.chatId || null,
    timestamp: new Date().toISOString(),
  };
  console.error(`${LOG_PREFIX} FAILED source=${source} url=${url} error=${entry.error} userId=${entry.userId} chatId=${entry.chatId}`);
  return entry;
}

export function logEvidenceInfo(source, url, message, context = {}) {
  const entry = {
    source,
    url,
    message,
    userId: context.userId || null,
    chatId: context.chatId || null,
    timestamp: new Date().toISOString(),
  };
  console.log(`${LOG_PREFIX} ${source} url=${url} ${message}`);
  return entry;
}
