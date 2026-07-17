console.log("🚀 Starting AI Marketing Platform Backend...");
import express from "express";
import "express-async-errors";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";
import { prisma } from "./config/prisma.js";

import { authRouter } from "./routes/auth.routes.js";
import { chatRouter } from "./routes/chat.routes.js";
import { dashboardRouter } from "./routes/dashboard.routes.js";
import { analysisRouter } from "./routes/analysis.routes.js";
import { scrapeRouter } from "./routes/scrape.routes.js";
import { productRouter } from "./routes/product.routes.js";
import { integrationsRouter } from "./routes/integrations.routes.js";
import { userRouter } from "./routes/user.routes.js";
import { notificationRouter } from "./routes/notification.routes.js";
import { competitorRouter } from "./modules/competitor-intelligence/competitor.routes.js";
import { seoRouter as seoIntRouter } from "./modules/seo-intelligence/seo.routes.js";
import { agentsRouter } from "./modules/ai-agents/agents.routes.js";
import { workflowRouter } from "./modules/ai-workflow/workflow.routes.js";
import { growthWorkspaceRouter } from "./modules/growth-workspace/growthWorkspace.routes.js";
import productAnalysisRouter from "./routes/productAnalysis.routes.js";
import { automationRouter } from "./routes/automation.routes.js";
import { reportRouter } from "./services/reporting/report.routes.js";
import { evidenceRouter } from "./modules/evidence/evidence.routes.js";
import { campaignRouter } from "./routes/campaign.routes.js";
import { emailCampaignRouter, brevoWebhookRouter } from "./routes/email-campaign.routes.js";
import { crmRouter } from "./routes/crm.routes.js";
import { salesCopilotRouter } from "./routes/sales-copilot.routes.js";
import diagnosticsRouter from "./routes/diagnostics.routes.js";

dotenv.config();

// Startup env validation
const REQUIRED_ENV_VARS = ['JWT_SECRET', 'DATABASE_URL'];
const MISSING_VARS = REQUIRED_ENV_VARS.filter(v => !process.env[v]);
if (MISSING_VARS.length > 0) {
  console.error(`❌ Missing required environment variables: ${MISSING_VARS.join(', ')}`);
  process.exit(1);
}
if (process.env.JWT_SECRET && process.env.JWT_SECRET.length < 32) {
  console.warn('⚠️ JWT_SECRET is too short (< 32 chars). Use a random 64-character string.');
}

const execAsync = promisify(exec);
const app = express();
const REQUIRED_PORT = parseInt(process.env.PORT || '5000', 10);

/**
 * Kill any existing process using the specified port
 * This ensures we always start fresh on port 5000
 */
async function killProcessOnPort(port) {
  try {
    const isWindows = process.platform === 'win32';
    
    if (isWindows) {
      // Find process using port on Windows
      try {
        const { stdout } = await execAsync(`netstat -ano | findstr :${port}`);
        const lines = stdout.trim().split('\n');
        const pids = new Set();
        
        for (const line of lines) {
          const match = line.trim().match(/LISTENING\s+(\d+)/);
          if (match) {
            pids.add(match[1]);
          }
        }
        
        // Kill each process
        for (const pid of pids) {
          if (pid !== process.pid.toString()) {
            try {
              await execAsync(`taskkill /F /PID ${pid}`);
              console.log(`✅ Killed existing process on port ${port} (PID: ${pid})`);
            } catch (err) {
              // Process might have already exited
            }
          }
        }
      } catch (err) {
        // Port likely not in use - this is fine
      }
    } else {
      // Unix-like systems (Linux, macOS)
      try {
        const { stdout } = await execAsync(`lsof -ti:${port}`);
        const pids = stdout.trim().split('\n').filter(Boolean);
        
        for (const pid of pids) {
          if (pid !== process.pid.toString()) {
            try {
              await execAsync(`kill -9 ${pid}`);
              console.log(`✅ Killed existing process on port ${port} (PID: ${pid})`);
            } catch (err) {
              // Process might have already exited
            }
          }
        }
      } catch (err) {
        // Port likely not in use - this is fine
      }
    }
  } catch (error) {
    console.error(`⚠️ Error checking port ${port}:`, error.message);
  }
}

/**
 * Start server on REQUIRED_PORT only - never switch ports
 */
async function startServer(app) {
  // First, kill any existing process on our port
  await killProcessOnPort(REQUIRED_PORT);
  
  // Wait a moment for port to be released
  await new Promise(resolve => setTimeout(resolve, 500));
  
  return new Promise((resolve, reject) => {
    const server = app.listen(REQUIRED_PORT, () => {
      console.log(`✅ Backend server running on http://localhost:${REQUIRED_PORT}`);
      console.log(`📡 API ready at http://localhost:${REQUIRED_PORT}/api`);
      resolve(server);
    });
    
    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        reject(new Error(
          `❌ Port ${REQUIRED_PORT} is still in use. Please manually kill the process:\n` +
          `   Windows: netstat -ano | findstr :${REQUIRED_PORT}\n` +
          `   Mac/Linux: lsof -ti:${REQUIRED_PORT} | xargs kill -9`
        ));
      } else {
        reject(err);
      }
    });
  });
}

// Trust proxy — required for rate limiting behind reverse proxies (e.g. Nginx, Render, Heroku)
app.set('trust proxy', 1);

// Compression
app.use(compression());

// Helmet with production-safe Content Security Policy
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

// Differentiated Rate Limiting
const isProduction = process.env.NODE_ENV === "production";

const minute = 60 * 1000;

// General API limiter — applied to all routes
const generalLimiter = rateLimit({
  windowMs: 15 * minute,
  max: isProduction ? 200 : 1000,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});
app.use(generalLimiter);

// Auth limiter — stricter to prevent brute force
const authLimiter = rateLimit({
  windowMs: 15 * minute,
  max: isProduction ? 20 : 100,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// AI route limiter — prevent runaway AI costs
const aiLimiter = rateLimit({
  windowMs: 1 * minute,
  max: isProduction ? 10 : 60,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// Automation & workflow limiter
const automationLimiter = rateLimit({
  windowMs: 15 * minute,
  max: isProduction ? 50 : 200,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// Email send limiter — 5 per hour per IP
const emailLimiter = rateLimit({
  windowMs: 60 * minute,
  max: isProduction ? 5 : 20,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// Image generation limiter — 10 per hour per IP
const imageLimiter = rateLimit({
  windowMs: 60 * minute,
  max: isProduction ? 10 : 30,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// Video render limiter — 3 per hour per IP
const videoLimiter = rateLimit({
  windowMs: 60 * minute,
  max: isProduction ? 3 : 15,
  standardHeaders: true,
  legacyHeaders: false,
  skip: () => !isProduction,
});

// CORS Configuration
const allowedOrigins = [
  ...(process.env.CLIENT_URL ? process.env.CLIENT_URL.split(',').map(s => s.trim()) : ["http://localhost:5173"]),
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://127.0.0.1:5173",
  "http://localhost:5174",
  "http://127.0.0.1:5174",
  "http://localhost:8080",
  "http://127.0.0.1:8080",
  "http://192.168.56.1:8080",
  "https://ai-marketing-platforms.vercel.app"
];

app.use(cors({
  origin: (origin, callback) => {
    if (!origin || !isProduction) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
      return;
    }
    // Allow Vercel preview deployments
    try {
      const url = new URL(origin);
      if (url.hostname.endsWith('.vercel.app')) {
        callback(null, true);
        return;
      }
    } catch {}
    callback(new Error("Not allowed by CORS"));
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
}));

app.options("*", cors());

app.use(express.json({ limit: isProduction ? "1mb" : "10mb" }));

app.get("/api/health", async (req, res) => {
  let dbStatus = "ok";
  try {
    await prisma.$queryRaw`SELECT 1`;
  } catch {
    dbStatus = "error";
  }
  res.json({
    status: "ok",
    message: "Backend running successfully",
    environment: process.env.NODE_ENV || "development",
    database: dbStatus,
    timestamp: new Date().toISOString(),
    commitSha: process.env.APP_COMMIT_SHA || 'unknown',
  });
});

app.get("/api/version", (req, res) => {
  res.json({
    commitSha: process.env.APP_COMMIT_SHA || 'unknown',
    environment: process.env.NODE_ENV || 'development',
    timestamp: new Date().toISOString(),
  });
});

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
app.use("/api/chats", automationLimiter, crmRouter);
app.use("/api/chats", automationLimiter, salesCopilotRouter);
app.use("/api/diagnostics", diagnosticsRouter);

// Brevo webhook (no auth required)
app.use("/api/webhooks/email", brevoWebhookRouter);

// Serve local fallback assets for Cloudinary-free operation
const localAssetsDir = path.join(process.cwd(), 'local-assets');
app.use('/api/local-assets', express.static(localAssetsDir));

// 404 handler
app.use((req, res) => {
  res.status(404).json({
    success: false,
    error: "Endpoint not found",
    path: req.originalUrl,
  });
});

// Global error handler - never crash server
app.use((err, req, res, _next) => {
  console.error("❌ Server error:", {
    message: err.message,
    stack: process.env.NODE_ENV === 'development' ? err.stack : undefined,
    path: req.originalUrl,
    method: req.method,
  });

  // Never expose internal errors in production
  const isDev = process.env.NODE_ENV === 'development';
  
  res.status(err.status || 500).json({
    success: false,
    error: isDev ? err.message : "Internal server error",
    ...(isDev && { stack: err.stack }),
  });
});

// Graceful shutdown handlers (module-level ref filled after server starts)
let runningServer;
function shutdownGracefully(signal) {
  console.log(`\n⚠️ ${signal} received, shutting down gracefully...`);
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

// Start server - always on port 5000
(async () => {
  try {
    runningServer = await startServer(app);
  } catch (error) {
    console.error('❌ Failed to start backend server:', error.message);
    process.exit(1);
  }
})();