import { prisma } from "../config/prisma.js";

export const listNotifications = async (req, res) => {
  try {
    const notifications = await prisma.notification.findMany({
      where: { userId: req.user.id },
      orderBy: { createdAt: "desc" },
    });
    return res.json({ notifications });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to list notifications" });
  }
};

export const markRead = async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.notification.updateMany({ where: { id, userId: req.user.id }, data: { read: true } });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to mark notification as read" });
  }
};

export const markAllRead = async (req, res) => {
  try {
    await prisma.notification.updateMany({ where: { userId: req.user.id, read: false }, data: { read: true } });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to mark notifications as read" });
  }
};

export const clearNotifications = async (req, res) => {
  try {
    await prisma.notification.deleteMany({ where: { userId: req.user.id } });
    return res.json({ success: true });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ success: false, error: "Failed to clear notifications" });
  }
};
