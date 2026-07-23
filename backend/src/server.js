import express from 'express';
import 'express-async-errors';
import cors from 'cors';
import dotenv from 'dotenv';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import compression from 'compression';
import path from 'path';
import { exec } from 'child_process';
import { promisify } from 'util';
import prisma from './config/prisma.js';

import { authRouter } from './routes/auth.routes.js';
import { chatRouter } from './routes/chat.routes.js';
import { dashboardRouter } from './domains/analytics/routes/dashboard.routes.js';
import { analysisRouter } from './domains/analytics/routes/analysis.routes.js';
import { scrapeRouter } from './domains/research/routes/scrape.routes.js';
import { productRouter } from './domains/content/routes/product.routes.js';
import { integrationsRouter } from './routes/integrations.routes.js';
import { userRouter } from './routes/user.routes.js';
import { notificationRouter } from './routes/notification.routes.js';
import { competitorRouter } from './modules/competitor-intelligence/competitor.routes.js';
import { seoRouter as seoIntRouter } from './domains/seo/routes/seo.routes.js';
import { agentsRouter } from './domains/ai/routes/agents.routes.js';
import { workflowRouter } from './domains/automation/routes/workflow.routes.js';
import { growthWorkspaceRouter } from './modules/growth-workspace/growthWorkspace.routes.js';
import productAnalysisRouter from './domains/content/routes/productAnalysis.routes.js';
import { automationRouter } from './domains/automation/routes/automation.routes.js';
import { reportRouter } from './services/reporting/report.routes.js';
import { evidenceRouter } from './modules/evidence/evidence.routes.js';
import { campaignRouter } from './domains/campaign/routes/campaign.routes.js';
import { emailCampaignRouter, brevoWebhookRouter } from './domains/email/routes/email-campaign.routes.js';
import { emailWorkflowRouter } from './domains/email/routes/email-workflow.routes.js';
import { crmRouter } from './domains/crm/routes/crm.routes.js';
import { salesCopilotRouter } from './routes/sales-copilot.routes.js';
import diagnosticsRouter from './routes/diagnostics.routes.js';
import { jobsRouter } from './routes/jobs.routes.js';
import { startScheduler, stopScheduler } from './jobs/scheduler.js';
import { startWorkers, stopWorkers } from './jobs/worker.js';
import { logBuildInfo, buildHeadersMiddleware, getBuildInfo } from './utils/build-info.util.js';
import { getAIProviderDiagnostics } from './domains/ai/services/aiOrchestrator.service.js';
import { isRedisAvailable } from './jobs/queues.js';

dotenv.config();

const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'];
const MISSING_VARS = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (MISSING_VARS.length > 0) {
  console.error(`❌ Missing required environment variables: ${MISSING_VARS.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️ JWT_SECRET is too short (< 32 chars)');
}
console.log('[1/8] ✅ Environment');

const execAsync = promisify(exec);
const app = express();
console.log('[2/8] ✅ Prisma');
console.log('[3/8] ✅ Express app');

function withTimeout(promise, ms, label) {
  let timer;
  const timeout = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise.finally(() => clearTimeout(timer)), timeout]);
}

async function startServer(app) {
  return new Promise((resolve, reject) => {
    const server = app.listen(REQUIRED_PORT, () => {
      resolve(server);
    });
    server.on('error', reject);
  });
}

const REQUIRED_PORT = parseInt(process.env.PORT || '5000', 10);
const isProduction = process.env.NODE_ENV === 'production';
const minute = 60 * 1000;

app.set('trust proxy', 1);
app.use(compression());
app.use(helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      scriptSrc: ["'self'", "'unsafe-inline'", "'unsafe-eval'"],
      styleSrc: ["'self'", "'unsafe-inline'"],
      imgSrc: ["'self'", "data:", "blob:"],
      connectSrc: ["'self'", process.env.CLIENT_URL || "http://localhost:5173"].filter(Boolean),
      fontSrc: ["'self'", "data:"],
      objectSrc: ["'none'"],
      mediaSrc: ["'self'"],
      frameSrc: ["'none'"],
    },
  },
  crossOriginEmbedderPolicy: false,
}));
console.log('[4/8] ✅ Middleware');

const generalLimiter = rateLimit({ windowMs: 15 * minute, max: isProduction ? 200 : 1000, standardHeaders: true, legacyHeaders: false, skip: () => !isProduction });
app.use(generalLimiter);

const authLimiter = rateLimit({ windowMs: 15 * minute, max: isProduction ? 20 : 100, standardHeaders: true, legacyHeaders: false, skip: () => !isProduction });
const aiLimiter = rateLimit({ windowMs: 1 * minute, max: isProduction ? 10 : 60, standardHeaders: true, legacyHeaders: false, skip: () => !isProduction });
const automationLimiter = rateLimit({ windowMs: 15 * minute, max: isProduction ? 50 : 200, standardHeaders: true, legacyHeaders: false, skip: () => !isProduction });

const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : ['http://localhost:5173']),
  'http://localhost:3000', 'http://127.0.0.1:3000', 'http://127.0.0.1:5173',
  'http://localhost:5174', 'http://127.0.0.1:5174',
  'http://localhost:8080', 'http://127.0.0.1:8080', 'http://192.168.56.1:8080',
  'https://ai-marketing-platforms.vercel.app',
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction) { callback(null, true); return; }
    if (allowedOrigins.indexOf(origin) !== -1) { callback(null, true); return; }
    try { const url = new URL(origin); if (url.hostname.endsWith('.vercel.app')) { callback(null, true); return; } } catch {}
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
app.options('*', cors());
app.use(buildHeadersMiddleware);
app.use(express.json({ limit: isProduction ? '1mb' : '10mb' }));

app.get('/api/health', async (req, res) => {
  let dbStatus = 'ok';
  try { await prisma.$queryRaw`SELECT 1`; } catch { dbStatus = 'error'; }
  const redisAvailable = isRedisAvailable();
  res.json({
    status: 'ok',
    message: 'Backend running',
    environment: process.env.NODE_ENV || 'development',
    version: process.env.APP_COMMIT_SHA || 'unknown',
    database: dbStatus,
    redis: redisAvailable ? 'connected' : 'not_configured',
    queues: redisAvailable ? 'available' : 'disabled',
    aiProviders: getAIProviderDiagnostics().map(p => ({ provider: p.provider, enabled: p.enabled })),
    emailProvider: process.env.BREVO_API_KEY ? { provider: 'brevo', configured: true }
      : process.env.SMTP_USER && process.env.SMTP_PASS ? { provider: 'gmail', configured: true }
      : process.env.SENDGRID_API_KEY ? { provider: 'sendgrid', configured: true }
      : { provider: null, configured: false },
    timestamp: new Date().toISOString(),
  });
});

app.get('/api/system/build-info', async (req, res) => { res.json(await getBuildInfo()); });
app.get('/api/version', (req, res) => res.json({
  commitSha: process.env.APP_COMMIT_SHA || 'unknown',
  environment: process.env.NODE_ENV || 'development',
  timestamp: new Date().toISOString(),
}));

app.use('/api/auth', authLimiter, authRouter);
app.use('/api/chats', chatRouter);
app.use('/api/dashboard', dashboardRouter);
app.use('/api/analysis', analysisRouter);
app.use('/api/chats', seoIntRouter);
app.use('/api/scrape', scrapeRouter);
app.use('/api/chats', productRouter);
app.use('/api/integrations', integrationsRouter);
app.use('/api/user', userRouter);
app.use('/api/notifications', notificationRouter);
app.use('/api/chats', competitorRouter);
app.use('/api/chats', aiLimiter, agentsRouter);
app.use('/api/chats', automationLimiter, workflowRouter);
app.use('/api/chats', growthWorkspaceRouter);
app.use('/api/product-analysis', productAnalysisRouter);
app.use('/api/automation', automationLimiter, automationRouter);
app.use('/api/chats', reportRouter);
app.use('/api/chats', evidenceRouter);
app.use('/api/campaign', automationLimiter, campaignRouter);
app.use('/api/chats', automationLimiter, emailCampaignRouter);
app.use('/api/content/email', automationLimiter, emailWorkflowRouter);
app.use('/api/chats', automationLimiter, crmRouter);
app.use('/api/chats', automationLimiter, salesCopilotRouter);
app.use('/api/diagnostics', diagnosticsRouter);
app.use('/api/jobs', jobsRouter);
app.use('/api/webhooks/email', brevoWebhookRouter);

const localAssetsDir = path.join(process.cwd(), 'local-assets');
app.use('/api/local-assets', express.static(localAssetsDir));

app.use((req, res) => res.status(404).json({ success: false, error: 'Endpoint not found', path: req.originalUrl }));

app.use((err, req, res, _next) => {
  console.error('❌ Server error:', { message: err.message, stack: isProduction ? undefined : err.stack, path: req.originalUrl, method: req.method });
  res.status(err.status || 500).json({
    success: false,
    error: isProduction ? 'Internal server error' : err.message,
    ...(isProduction ? {} : { stack: err.stack }),
  });
});
console.log('[5/8] ✅ Routes');

let runningServer;
async function shutdownGracefully(signal) {
  console.log(`\n⚠️ ${signal} received, shutting down gracefully...`);
  try { stopScheduler(); } catch {}
  try { await stopWorkers(); } catch {}
  if (runningServer) {
    runningServer.close(() => { prisma.$disconnect().catch(() => {}); process.exit(0); });
    setTimeout(() => process.exit(1), 10000);
  } else {
    prisma.$disconnect().catch(() => {});
    process.exit(0);
  }
}
process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

function printConfigReport() {
  console.log('');
  console.log('═══════════════════════════════════════');
  console.log('     STARTUP CONFIGURATION REPORT');
  console.log('═══════════════════════════════════════');
  console.log('  [Required]');
  for (const v of ['DATABASE_URL', 'JWT_SECRET']) {
    const ok = !!process.env[v];
    console.log(`    ${ok ? '✅' : '❌'} ${v}${ok ? '' : ' — MISSING'}`);
  }
  console.log('  [Optional]');
  for (const v of ['REDIS_URL', 'GEMINI_API_KEY', 'GROQ_API_KEY', 'CEREBRAS_API_KEY', 'DEEPSEEK_API_KEY', 'OPENROUTER_API_KEY', 'FIRECRAWL_API_KEY', 'TAVILY_API_KEY', 'DATAFORSEO_LOGIN', 'DATAFORSEO_PASSWORD', 'SERPAPI_API_KEY', 'BREVO_API_KEY']) {
    console.log(`    ${process.env[v] ? '✅' : '  '} ${v}${process.env[v] ? '' : ' — not set'}`);
  }
  if (!isRedisAvailable()) console.log('    Redis — not configured (queues, workers, scheduler disabled)');
  console.log('  [AI Providers]');
  for (const d of getAIProviderDiagnostics()) {
    console.log(`    ${d.enabled ? '✅' : '  '} ${d.provider}${d.enabled ? '' : ' — not configured'} (model: ${d.defaultModel})`);
  }
  console.log('═══════════════════════════════════════');
}

(async () => {
  try {
    console.log('[6/8] ✅ HTTP Server');
    runningServer = await withTimeout(startServer(app), 30000, 'HTTP Server start');
    console.log(`[6/8]    Listening on http://localhost:${REQUIRED_PORT}`);

    printConfigReport();

    console.log('[7/8] ✅ Background services');
    withTimeout(logBuildInfo(), 5000, 'Build info').catch(() => {});
    withTimeout(startWorkers(), 10000, 'Workers').catch(() => {});
    startScheduler();

    console.log('[8/8] ✅ Startup Complete');
  } catch (error) {
    if (error.message && (error.message.includes('DATABASE_URL') || error.message.includes('JWT_SECRET'))) {
      console.error('❌', error.message);
      process.exit(1);
    }
    console.error('❌ Failed to start backend server:', error.message);
    process.exit(1);
  }
})();