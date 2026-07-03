import express from "express";
import { listNotifications, markRead, markAllRead, clearNotifications } from "../controllers/notification.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const notificationRouter = express.Router();
notificationRouter.use(requireAuth);
notificationRouter.get("/", listNotifications);
notificationRouter.put("/:id/read", markRead);
notificationRouter.put("/read-all", markAllRead);
notificationRouter.delete("/clear", clearNotifications);
