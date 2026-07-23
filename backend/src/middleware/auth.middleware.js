import jwt from "jsonwebtoken";
import prisma from "../config/prisma.js";

const secret = process.env.JWT_SECRET;
if (secret && (secret.length < 32 || /^\d+$/.test(secret))) {
  console.warn(
    "⚠  WARNING: JWT_SECRET is weak (%d chars, %s). Use a random 64-char hex string for production.",
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
  } catch {
  }
}

export const requireAuth = async (req, res, next) => {
  if (!process.env.JWT_SECRET) {
    return res.status(500).json({ error: "JWT_SECRET is not configured" });
  }

  const authorizationHeader = req.headers.authorization;
  if (!authorizationHeader?.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Authorization token missing" });
  }

  const token = authorizationHeader.split(" ")[1];
  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET);
    const user = await prisma.user.findUnique({ where: { id: payload.userId } });
    if (!user) {
      return res.status(401).json({ error: "Invalid token" });
    }
    updateLastActive(user.id);
    req.user = { ...user, lastActiveAt: new Date() };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
