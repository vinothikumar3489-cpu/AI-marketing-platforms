const RID_SYMBOL = Symbol('requestId');

let _counter = 0;
export function generateBrainId() {
  _counter++;
  return `BRAIN-${Date.now().toString(36).toUpperCase()}-${_counter.toString(36).toUpperCase().padStart(4, '0')}`;
}

export function elapsedMs(start) {
  return Date.now() - start;
}

export { RID_SYMBOL };

export const EngineStatus = Object.freeze({
  INITIALIZED: 'INITIALIZED',
  RUNNING: 'RUNNING',
  COMPLETED: 'COMPLETED',
  FAILED: 'FAILED',
  SKIPPED: 'SKIPPED',
  SHUTDOWN: 'SHUTDOWN',
});

export const HealthStatus = Object.freeze({
  HEALTHY: 'HEALTHY',
  DEGRADED: 'DEGRADED',
  UNHEALTHY: 'UNHEALTHY',
  NOT_CONFIGURED: 'NOT_CONFIGURED',
});

export function logEngine(engine, rid, elapsed, status, error) {
  const parts = [
    `[${rid}]`,
    `[Brain:${engine}]`,
    `elapsed=${elapsed}ms`,
    `status=${status}`,
  ];
  if (error) parts.push(`error=${error}`);
  console.log(parts.join(' '));
}
