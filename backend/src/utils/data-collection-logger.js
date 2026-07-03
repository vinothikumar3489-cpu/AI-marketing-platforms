// ============================================
// DATA COLLECTION LOGGER
// Standardized logging for all collectors.
// Every API call should use this logger.
// ============================================

function formatDuration(startTime) {
  const ms = Date.now() - startTime;
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(2)}s`;
}

export function logCollectionStart(collector, target) {
  const timestamp = new Date().toISOString();
  console.log(`\n═══════════════════════════════════════`);
  console.log(`[${timestamp}] 📡 [Collector] ${collector} STARTED`);
  console.log(`  Target: ${target}`);
  console.log(`───────────────────────────────────────`);
  return Date.now();
}

export function logCollectionEnd(collector, startTime, stats = {}) {
  const duration = formatDuration(startTime);
  const timestamp = new Date().toISOString();
  console.log(`───────────────────────────────────────`);
  console.log(`[${timestamp}] 📡 [Collector] ${collector} FINISHED`);
  console.log(`  Duration: ${duration}`);
  if (stats.recordsRetrieved !== undefined) console.log(`  Records Retrieved: ${stats.recordsRetrieved}`);
  if (stats.status) console.log(`  Status: ${stats.status}`);
  if (stats.success !== undefined) console.log(`  Success: ${stats.success}`);
  if (stats.storeCount !== undefined) console.log(`  Stored: ${stats.storeCount}`);
  console.log(`═══════════════════════════════════════\n`);
}

export function logCollectionError(collector, startTime, error) {
  const duration = formatDuration(startTime);
  const timestamp = new Date().toISOString();
  console.log(`───────────────────────────────────────`);
  console.log(`[${timestamp}] ❌ [Collector] ${collector} FAILED`);
  console.log(`  Duration: ${duration}`);
  console.log(`  Error: ${error.message || error}`);
  console.log(`═══════════════════════════════════════\n`);
}

export function logAnalysisStart(analyzer, input) {
  const timestamp = new Date().toISOString();
  console.log(`\n═══════════════════════════════════════`);
  console.log(`[${timestamp}] 🔬 [Analysis] ${analyzer} STARTED`);
  if (input) console.log(`  Input: ${JSON.stringify(input).substring(0, 200)}`);
  console.log(`───────────────────────────────────────`);
  return Date.now();
}

export function logAnalysisEnd(analyzer, startTime, result = {}) {
  const duration = formatDuration(startTime);
  const timestamp = new Date().toISOString();
  console.log(`───────────────────────────────────────`);
  console.log(`[${timestamp}] 🔬 [Analysis] ${analyzer} FINISHED`);
  console.log(`  Duration: ${duration}`);
  if (result.provider) console.log(`  Provider: ${result.provider}`);
  if (result.confidenceScore !== undefined) console.log(`  Confidence: ${result.confidenceScore}`);
  if (result.hasVerifiedData !== undefined) console.log(`  Has Verified Data: ${result.hasVerifiedData}`);
  console.log(`═══════════════════════════════════════\n`);
}

export function logFallbackUsed(analyzer, reason) {
  console.log(`  ⚠️ [Fallback] ${analyzer}: ${reason}`);
}

export function logStoreCount(store, count) {
  console.log(`  💾 [Store] ${store} saved ${count} records`);
}
