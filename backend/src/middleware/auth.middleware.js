import jwt from "jsonwebtoken";
import { prisma } from "../config/prisma.js";

const secret = process.env.JWT_SECRET;
if (secret && (secret.length < 32 || /^\d+$/.test(secret))) {
  console.warn(
    "⚠  WARNING: JWT_SECRET is weak (%d chars, %s). Use a random 64-char hex string for production.",
    secret.length,
    /^\d+$/.test(secret) ? "numeric-only" : "too short"
  );
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
    await prisma.user.update({ where: { id: user.id }, data: { lastActiveAt: new Date() } });
    req.user = { ...user, lastActiveAt: new Date() };
    next();
  } catch (error) {
    return res.status(401).json({ error: "Invalid or expired token" });
  }
};
