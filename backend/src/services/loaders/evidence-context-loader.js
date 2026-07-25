const contextCache = new Map();

export function getCachedContext(chatId) {
  return contextCache.get(chatId) || null;
}

export function setCachedContext(chatId, context) {
  contextCache.set(chatId, context);
  return context;
}

export function clearCachedContext(chatId) {
  contextCache.delete(chatId);
}

export function clearAllCachedContexts() {
  contextCache.clear();
}

export async function loadEvidenceContextOnce(prisma, userId, chatId, buildFn) {
  const cached = getCachedContext(chatId);
  if (cached) return cached;

  const context = await buildFn(prisma, userId, chatId);
  if (context && !context.rejected) {
    setCachedContext(chatId, context);
  }
  return context;
}
