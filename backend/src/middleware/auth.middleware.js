import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const secret = process.env.JWT_SECRET;
if (secret && (secret.length < 32 || /^\d+$/.test(secret))) {
  console.warn(
    "WARNING: JWT_SECRET is weak (%d chars, %s). Use a random 64-char hex string for production.",
    secret.length,
    /^\d+$/.test(secret) ? "numeric-only" : "too short"
  );
}

const lastActiveCache = new Map();
const ACTIVE_THROTTLE_MS = 5 * 60 * 1000;

async function updateLastActive(userId) {
  const now = Date.now();
  const last = lastActiveCache.get(userId);
  if (last && now - last < ACTIVE_THROTTLE_MS) return;
  lastActiveCache.set(userId, now);
  try {
    await prisma.user.update({ where: { id: userId }, data: { lastActiveAt: new Date() } });
  } catch (err) {
    console.error(`[AUTH] [updateLastActive] FAILED: ${err.message}`);
  }
}

export const requireAuth = async (req, res, next) => {
  const rid = req.requestId || 'NO_RID';

  if (!process.env.JWT_SECRET) {
    console.error(`[${rid}] [AUTH] STEP 1 FAIL: JWT_SECRET is not configured`);
    return res.status(500).json({ error: "JWT_SECRET is not configured", requestId: rid });
  }

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader?.startsWith("Bearer ")) {
    console.error(`[${rid}] [AUTH] STEP 1 FAIL: No Bearer token in Authorization header`);
    return res.status(401).json({ error: "Authorization token missing", requestId: rid });
  }

  const token = authorizationHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    console.log(`[${rid}] [AUTH] STEP 1 PASS: JWT verified for userId=${payload.userId}`);

    let user;
    try {
      console.log(`[${rid}] [AUTH] STEP 2: Querying DB for user id=${payload.userId}`);
      user = await prisma.user.findUnique({ where: { id: payload.userId } });
    } catch (dbErr) {
      console.error(`[${rid}] [AUTH] STEP 2 FAIL: DB query threw — file=auth.middleware.js, fn=requireAuth, line=43`);
      console.error(`[${rid}] [AUTH] DB error: ${dbErr.message}`);
      console.error(`[${rid}] [AUTH] Stack: ${dbErr.stack}`);
      console.error(`[${rid}] [AUTH] Recommended fix: Ensure DATABASE_URL is reachable and PostgreSQL is running`);
      return res.status(500).json({ error: "Authentication service unavailable (DB)", requestId: rid });
    }

    if (!user) {
      console.error(`[${rid}] [AUTH] STEP 2 FAIL: User not found in DB for userId=${payload.userId}`);
      return res.status(401).json({ error: "Invalid token", requestId: rid });
    }

    console.log(`[${rid}] [AUTH] STEP 2 PASS: User found: ${user.email || user.id}`);

    updateLastActive(user.id);
    req.user = { ...user, lastActiveAt: new Date() };
    console.log(`[${rid}] [AUTH] STEP 3 PASS: req.user set, calling next()`);
    next();
  } catch (error) {
    console.error(`[${rid}] [AUTH] STEP 1 FAIL: JWT verification threw — ${error.message}`);
    return res.status(401).json({ error: "Invalid or expired token", requestId: rid });
  }
};
