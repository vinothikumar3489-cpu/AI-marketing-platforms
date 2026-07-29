import pkg from "@prisma/client";
const { PrismaClient } = pkg;

function maskUrl(url) {
  if (!url) return 'NOT SET';
  return url.replace(/:([^@]+)@/, ':***@');
}

function getConnectionConfig() {
  const url = process.env.DATABASE_URL || '';
  const parsed = url ? new URL(url) : null;

  return {
    url,
    masked: maskUrl(url),
    host: parsed?.hostname || 'unknown',
    port: parsed?.port || '5432',
    database: parsed ? parsed.pathname.replace('/', '') : 'unknown',
    user: parsed?.username || 'unknown',
    sslMode: parsed?.searchParams.get('sslmode') || 'not set',
    poolSize: parseInt(process.env.DATABASE_POOL_SIZE || '10', 10),
    connectionTimeout: parseInt(process.env.DATABASE_CONNECTION_TIMEOUT || '10000', 10),
  };
}

export function printDatabaseConfig() {
  const cfg = getConnectionConfig();
  console.log('[DB Config] Host:', cfg.host);
  console.log('[DB Config] Port:', cfg.port);
  console.log('[DB Config] Database:', cfg.database);
  console.log('[DB Config] User:', cfg.user);
  console.log('[DB Config] SSL Mode:', cfg.sslMode);
  console.log('[DB Config] Pool Size:', cfg.poolSize);
  console.log('[DB Config] Connection URL:', cfg.masked);
}

const prisma = new PrismaClient({
  log: [
    { level: 'error', emit: 'event' },
    { level: 'warn', emit: 'event' },
  ],
  datasources: {
    db: {
      url: process.env.DATABASE_URL,
    },
  },
});

prisma.$on('error', (e) => {
  console.error('[Prisma] Error event:', e.message);
  if (e.stack) console.error('[Prisma] Stack:', e.stack.split('\n').slice(0, 5).join('\n'));
});

prisma.$on('warn', (e) => {
  console.warn('[Prisma] Warning:', e.message);
});

export async function connectWithRetry(maxRetries = 5, delayMs = 3000) {
  const cfg = getConnectionConfig();
  console.log('[Prisma] Connecting to PostgreSQL...');
  console.log('[Prisma] URL:', cfg.masked);
  console.log('[Prisma] Host:', cfg.host);
  console.log('[Prisma] Port:', cfg.port);
  console.log('[Prisma] Database:', cfg.database);
  console.log('[Prisma] SSL Mode:', cfg.sslMode);

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`[Prisma] Connection attempt ${attempt}/${maxRetries}...`);
      await prisma.$connect();
      console.log(`[Prisma] Connected successfully on attempt ${attempt}`);

      const result = await prisma.$queryRaw`SELECT 1 as ok, current_database() as db, version() as ver`;
      const dbInfo = result[0];
      console.log(`[Prisma] PostgreSQL ${dbInfo.ver}, database=${dbInfo.db}`);

      return { success: true, host: cfg.host, port: cfg.port, database: cfg.database, version: dbInfo.ver };
    } catch (err) {
      console.error(`[Prisma] Attempt ${attempt}/${maxRetries} FAILED`);
      console.error(`[Prisma] Error code: ${err.code || 'N/A'}`);
      console.error(`[Prisma] Error message: ${err.message}`);
      if (err.stack) {
        const stackLines = err.stack.split('\n');
        console.error(`[Prisma] Stack: ${stackLines.slice(0, 6).join('\n')}`);
      }

      if (attempt < maxRetries) {
        const jitter = Math.floor(Math.random() * 1000);
        const waitMs = delayMs * Math.pow(1.5, attempt - 1) + jitter;
        console.log(`[Prisma] Retrying in ${Math.round(waitMs / 1000)}s...`);
        await new Promise(r => setTimeout(r, waitMs));
      } else {
        console.error(`[Prisma] All ${maxRetries} attempts failed. Database is unreachable.`);
        console.error(`[Prisma] Host: ${cfg.host}`);
        console.error(`[Prisma] Port: ${cfg.port}`);
        console.error(`[Prisma] Database: ${cfg.database}`);
        console.error(`[Prisma] SSL Mode: ${cfg.sslMode}`);
        console.error(`[Prisma] Last error code: ${err.code || 'N/A'}`);
        console.error(`[Prisma] Last error message: ${err.message}`);
        console.error(`[Prisma] Recommended fix: Verify DATABASE_URL, Render PG status, and network connectivity`);
        return { success: false, error: err.message, code: err.code, host: cfg.host, port: cfg.port, database: cfg.database, sslMode: cfg.sslMode };
      }
    }
  }

  return { success: false, error: 'Exceeded retry count' };
}

export { prisma };
export default prisma;
