console.log("🚀 Starting AI Marketing Platform Backend...");
import express from "express";
import "express-async-errors";
import cors from "cors";
import dotenv from "dotenv";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import compression from "compression";
import { exec } from "child_process";
import { promisify } from "util";

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

dotenv.config();

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

// CORS Configuration
const allowedOrigins = [
  process.env.CLIENT_URL,
  "http://localhost:5173",
  "http://localhost:3000",
].filter(Boolean);

const isAllowedVercelPreview = (origin) => {
  return /^https:\/\/ai-marketing-platforms-[a-z0-9-]+-vinoth4\.vercel\.app$/.test(origin);
};

app.use(cors({
  origin: (origin, callback) => {
    if (!origin) return callback(null, true);

    if (allowedOrigins.includes(origin) || isAllowedVercelPreview(origin)) {
      return callback(null, true);
    }

    return callback(new Error(`CORS blocked origin: ${origin}`));
  },
  credentials: true,
}));

app.options("*", cors());

app.use(express.json({ limit: isProduction ? "1mb" : "10mb" }));

app.get("/api/health", (req, res) => {
  res.json({
    status: "ok",
    message: "Backend running successfully",
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

// Graceful shutdown handlers
process.on('SIGTERM', () => {
  console.log('\n⚠️ SIGTERM received, shutting down gracefully...');
  process.exit(0);
});

process.on('SIGINT', () => {
  console.log('\n⚠️ SIGINT received, shutting down gracefully...');
  process.exit(0);
});

// Start server - always on port 5000
(async () => {
  try {
    await startServer(app);
  } catch (error) {
    console.error('❌ Failed to start backend server:', error.message);
    process.exit(1);
  }
})();