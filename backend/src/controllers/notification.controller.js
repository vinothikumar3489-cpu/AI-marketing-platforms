import { prisma } from "../config/prisma.js";

export const listNotifications = async (req, res) => {
  const notifications = await prisma.notification.findMany({
    where: { userId: req.user.id },
    orderBy: { createdAt: "desc" },
  });
  return res.json({ notifications });
};

export const markRead = async (req, res) => {
  const { id } = req.params;
  await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { read: true } });
  return res.json({ success: true });
};

export const markAllRead = async (req, res) => {
  await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
  return res.json({ success: true });
};

export const clearNotifications = async (req, res) => {
  await prisma.notification.deleteMany({ where: { userId: req.user.id } });
  return res.json({ success: true });
};
