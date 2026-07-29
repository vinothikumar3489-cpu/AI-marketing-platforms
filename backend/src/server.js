console.log("[1/8] Environment — loading modules...");
import express from "express";
import "express-async-errors";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import path from "path";
import { exec, execSync } from "child_process";
import { promisify } from "util";
import { fileURLToPath } from "url";
import { readFileSync } from "fs";

import { authRouter } from "./routes/auth.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { dashboardRouter } from "./domains/analytics/routes/dashboard.routes.js";
import { analysisRouter } from "./domains/analytics/routes/analysis.routes.js";
import { scrapeRouter } from "./domains/research/routes/scrape.routes.js";
import { productRouter } from "./domains/content/routes/product.routes.js";
import { integrationsRouter } from "./routes/integrations.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { competitorRouter } from "./modules/competitor-intelligence/competitor.routes.js";
import { seoRouter as seoIntRouter } from "./domains/seo/routes/seo.routes.js";
import { agentsRouter } from "./domains/ai/routes/agents.routes.js";
import { workflowRouter } from "./domains/automation/routes/workflow.routes.js";
import { growthWorkspaceRouter } from "./modules/growth-workspace/growthWorkspace.routes.js";
import productAnalysisRouter from "./domains/content/routes/productAnalysis.routes.js";
import { automationRouter } from "./domains/automation/routes/automation.routes.js";
import { reportRouter } from "./services/reporting/report.routes.js";
import { evidenceRouter } from "./modules/evidence/evidence.routes.js";
import { campaignRouter } from "./domains/campaign/routes/campaign.routes.js";
import { emailCampaignRouter, brevoWebhookRouter } from "./domains/email/routes/email-campaign.routes.js";
import { emailWorkflowRouter } from "./domains/email/routes/email-workflow.routes.js";
import { crmRouter } from "./domains/crm/routes/crm.routes.js";
import { salesCopilotRouter } from "./routes/sales-copilot.routes.js";
import { brainRouter } from "./routes/brain.routes.js";

console.log("[2/8] Environment — loading config...");
dotenv.config();

// Build metadata logging
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function getBuildMetadata() {
  try {
    const branch = execSync('git branch --show-current').toString().trim();
    const commitSha = execSync('git rev-parse HEAD').toString().trim();
    return {
      branch,
      commitSha,
      nodeEnv: process.env.NODE_ENV || 'development'
    };
  } catch (error) {
    console.warn('Could not retrieve git metadata:', error.message);
    return {
      branch: 'unknown',
      commitSha: 'unknown',
      nodeEnv: process.env.NODE_ENV || 'development'
    };
  }
}

const buildMetadata = getBuildMetadata();
console.log('Build Metadata:', JSON.stringify(buildMetadata, null, 2));

// Startup env validation
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'];
const MISSING_VARS = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (MISSING_VARS.length > 0) {
  console.error(`Missing required environment variables: ${MISSING_VARS.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('JWT_SECRET is too short (< 32 chars). Use a random 64-character string.');
}

// Print masked DATABASE_URL at startup
const maskedDbUrl = (process.env.DATABASE_URL || 'NOT SET').replace(/:([^@]+)@/, ':***@');
console.log('[DB] DATABASE_URL:', maskedDbUrl);

console.log("[3/8] Environment — validating variables...");
const { logProviderConfig } = await import("./services/provider-health.service.js");
logProviderConfig();

// Log active email provider with detailed health check
try {
  const { logActiveProvider, getEmailProviderHealth } = await import("./services/providers/email/email-provider-registry.js");
  logActiveProvider();
  const health = getEmailProviderHealth();
  const brevoHealth = health.providers?.brevo;
  if (brevoHealth) {
    console.log(`[Email Provider] Provider: Brevo`);
    console.log(`[Email Provider] Configured: ${brevoHealth.configured}`);
    console.log(`[Email Provider] Sender Set: ${brevoHealth.senderConfigured}`);
    console.log(`[Email Provider] API Key: ${brevoHealth.configured ? 'loaded' : 'MISSING'}`);
    console.log(`[Email Provider] Status: ${brevoHealth.status}`);
    if (!brevoHealth.configured) {
      console.warn(`[Email Provider] Brevo not configured — set BREVO_API_KEY in .env`);
    } else if (!brevoHealth.senderConfigured) {
      console.warn(`[Email Provider] Brevo sender not configured — set BREVO_SENDER_EMAIL or BREVO_FROM_EMAIL`);
    }
  }
  const smtpHealth = health.providers?.smtp;
  if (smtpHealth?.configured) {
    console.log(`[Email Provider] SMTP: connected (${process.env.SMTP_HOST || 'unknown'})`);
  }
  if (!health.canSend) {
    console.warn(`[Email Provider] No usable email provider — email sending will fail`);
  }
} catch (e) {
  console.warn('[Mail Provider] Could not determine active provider:', e.message);
}

const execAsync = promisify(exec);
const app = express();
console.log("[4/8] Middleware — configuring...");
const REQUIRED_PORT = parseInt(process.env.PORT || '5000', 10);

async function killProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';
    if (isWindows) {
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        for (const line of lines) {
          const match = line.trim().match(/LISTENING\s+(\d+)/);
          if (match) pids.add(match[1]);
        }
        for (const pid of pids) {
          if (pid !== process.pid.toString()) {
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              console.log(`Killed existing process on port ${port} (PID: ${pid})`);
            } catch {}
          }
        }
      } catch {}
    } else {
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        for (const pid of pids) {
          if (pid !== process.pid.toString()) {
            try {
              await execAsync(`kill -9 ${pid}`);
              console.log(`Killed existing process on port ${port} (PID: ${pid})`);
            } catch {}
          }
        }
      } catch {}
    }
  } catch (error) {
    console.error(`Error checking port ${port}:`, error.message);
  }
}

async function startServer(app) {
  await killProcessOnPort(REQUIRED_PORT);
  await new Promise(resolve => setTimeout(resolve, 500));
  return new Promise((resolve, reject) => {
    const server = app.listen(REQUIRED_PORT, () => {
      console.log(`Backend server running on http://localhost:${REQUIRED_PORT}`);
      console.log(`API ready at http://localhost:${REQUIRED_PORT}/api`);
      resolve(server);
    });
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(`Port ${REQUIRED_PORT} is still in use. Please manually kill the process.`));
      } else {
        reject(err);
      }
    });
  });
}

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

const isProduction = process.env.NODE_ENV === "production";
const minute = 60 * 1000;

const generalLimiter = rateLimit({
  windowMs: 15 * minute, max: isProduction ? 200 : 1000,
  standardHeaders: true, legacyHeaders: false,
  skip: () => !isProduction,
});
app.use(generalLimiter);

const authLimiter = rateLimit({
  windowMs: 15 * minute, max: isProduction ? 20 : 100,
  standardHeaders: true, legacyHeaders: false,
  skip: () => !isProduction,
});

const aiLimiter = rateLimit({
  windowMs: 1 * minute, max: isProduction ? 10 : 60,
  standardHeaders: true, legacyHeaders: false,
  skip: () => !isProduction,
});

const automationLimiter = rateLimit({
  windowMs: 15 * minute, max: isProduction ? 50 : 200,
  standardHeaders: true, legacyHeaders: false,
  skip: () => !isProduction,
});

const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : ["http://localhost:5173"]),
  "http://localhost:3000", "http://127.0.0.1:3000",
  "http://127.0.0.1:5173", "http://localhost:5174", "http://127.0.0.1:5174",
  "http://localhost:8080", "http://127.0.0.1:8080", "http://192.168.56.1:8080",
  "https://ai-marketing-platforms.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction) { callback(null, true); return; }
    if (allowedOrigins.indexOf(origin) !== -1) { callback(null, true); return; }
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.vercel.app')) { callback(null, true); return; }
    } catch {}
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());
app.use(express.json({ limit: isProduction ? "1mb" : "10mb" }));

// Request ID middleware
import { requestIdMiddleware } from "./utils/request-id.js";
app.use(requestIdMiddleware);

// ============================================
// DATABASE CONNECTION
// ============================================
import { connectWithRetry, printDatabaseConfig, prisma } from "./config/prisma.js";

let dbConnected = false;
let dbInfo = null;
let dbError = null;

console.log("[3a/8] Database — connecting...");
printDatabaseConfig();

const dbResult = await connectWithRetry(5, 3000);
if (dbResult.success) {
  dbConnected = true;
  dbInfo = dbResult;
  console.log('');
  console.log('==============================');
  console.log('  DATABASE CONNECTED');
  console.log('==============================');
  console.log(`  Host: ${dbResult.host}`);
  console.log(`  Port: ${dbResult.port}`);
  console.log(`  Database: ${dbResult.database}`);
  console.log(`  Version: ${dbResult.version}`);
  console.log('==============================');
} else {
  dbError = dbResult;
  console.error('');
  console.error('==============================');
  console.error('  DATABASE FAILED');
  console.error('==============================');
  console.error(`  Host: ${dbResult.host}`);
  console.error(`  Port: ${dbResult.port}`);
  console.error(`  Database: ${dbResult.database}`);
  console.error(`  SSL Mode: ${dbResult.sslMode}`);
  console.error(`  Error: ${dbResult.error}`);
  console.error(`  Code: ${dbResult.code}`);
  console.error('==============================');
  console.error('');
  console.error('The server will start WITHOUT database connectivity.');
  console.error('All database-dependent features (auth, email templates, users) will fail.');
  console.error('Fix DATABASE_URL or PostgreSQL access before using those features.');
}

// ============================================
// HEALTH ENDPOINTS
// ============================================
console.log("[7/8] Health endpoint — registering...");

app.get("/api/health", async (req, res) => {
  let dbStatus = "error";
  let dbDetail = null;
  try {
    await prisma.$queryRaw`SELECT 1`;
    dbStatus = "ok";
  } catch (err) {
    dbStatus = "error";
    dbDetail = err.message;
  }
  res.json({
    status: "ok",
    message: "Backend running successfully",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    databaseDetail: dbDetail,
    timestamp: new Date().toISOString(),
    commitSha: process.env.APP_COMMIT_SHA || 'unknown',
  });
});

app.get("/api/health/database", async (req, res) => {
  let connected = false;
  let detail = null;
  let version = null;
  let dbName = null;

  try {
    const result = await prisma.$queryRaw`SELECT 1 as ok, current_database() as db, version() as ver`;
    connected = true;
    version = result[0]?.ver || null;
    dbName = result[0]?.db || null;
  } catch (err) {
    detail = { code: err.code || 'N/A', message: err.message };
  }

  res.json({
    success: connected,
    connected,
    host: dbInfo?.host || 'unknown',
    port: dbInfo?.port || '5432',
    database: dbName || dbInfo?.database || 'unknown',
    version,
    sslMode: 'require',
    error: detail,
    startupConnected: dbConnected,
    startupError: dbError,
  });
});

app.get("/api/version", (req, res) => {
  res.json({
    commitSha: process.env.APP_COMMIT_SHA || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

// ============================================
// BRAIN UNIVERSAL MIDDLEWARE
// ============================================
import { brainMiddleware } from './middleware/brainMiddleware.js';
app.use('/api', brainMiddleware);

// ============================================
// BRAIN API ROUTES
// ============================================
app.use("/api/brain", brainRouter);

// ============================================
// ROUTES
// ============================================
console.log("[5/8] Routes — registering...");
app.use("/api/auth", authLimiter, authRouter);
app.use("/api/chats", chatRouter);
app.use("/api/dashboard", dashboardRouter);
app.use("/api/analysis", analysisRouter);
app.use("/api/chats", seoIntRouter);
app.use("/api/scrape", scrapeRouter);
app.use("/api/chats", productRouter);
app.use("/api/integrations", integrationsRouter);
app.use("/api/user", userRouter);
app.use("/api/notifications", notificationRouter);
app.use("/api/chats", competitorRouter);
app.use("/api/chats", aiLimiter, agentsRouter);
app.use("/api/chats", automationLimiter, workflowRouter);
app.use("/api/chats", growthWorkspaceRouter);
app.use("/api/product-analysis", productAnalysisRouter);
app.use("/api/automation", automationLimiter, automationRouter);
app.use("/api/chats", reportRouter);
app.use("/api/chats", evidenceRouter);
app.use("/api/campaign", automationLimiter, campaignRouter);
app.use("/api/chats", automationLimiter, emailCampaignRouter);
app.use("/api/content/email", emailWorkflowRouter);
app.use("/api/chats", automationLimiter, crmRouter);
app.use("/api/chats", automationLimiter, salesCopilotRouter);

app.use("/api/webhooks/email", brevoWebhookRouter);

const localAssetsDir = path.join(process.cwd(), 'local-assets');
app.use('/api/local-assets', express.static(localAssetsDir));

app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

app.use((err, req, res, _next) => {
  console.error("Server error:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });
  const isDev = process.env.NODE_ENV === 'development';
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : "Internal server error",
    ...(isDev && { stack: err.stack }),
  });
});

// ============================================
// BRAIN (Marketing Intelligence Core)
// ============================================
let brainService = null;
if (dbConnected) {
  const { initializeBrain, getBrain } = await import('./brain/index.js');
  try {
    brainService = await initializeBrain(prisma);
    console.log("[BRAIN] Marketing Intelligence Core initialized");
  } catch (err) {
    console.error("[BRAIN] Failed to initialize Brain Core:", err.message);
    console.error("[BRAIN] Server will continue without Brain features");
  }
} else {
  console.log("[BRAIN] Skipped — no database connection");
}

console.log("[6/8] Startup — preparing to listen...");

let runningServer;
async function shutdownGracefully(signal) {
  console.log(`\n${signal} received, shutting down gracefully...`);
  if (brainService) {
    try {
      const scheduler = brainService.scheduler;
      if (scheduler && typeof scheduler.shutdown === 'function') {
        await scheduler.shutdown();
      }
    } catch (err) {
      console.error("[BRAIN] Error during scheduler shutdown:", err.message);
    }
  }
  if (runningServer) {
    runningServer.close(() => {
      prisma.$disconnect();
      process.exit(0);
    });
    setTimeout(() => process.exit(1), 10000);
  } else {
    prisma.$disconnect();
    process.exit(0);
  }
}
process.on('SIGTERM', () => shutdownGracefully('SIGTERM'));
process.on('SIGINT', () => shutdownGracefully('SIGINT'));

(async () => {
  try {
    runningServer = await startServer(app);
    console.log("[8/8] Startup Complete — ready for requests");
  } catch (error) {
    console.error('Failed to start backend server:', error.message);
    process.exit(1);
  }
})();
