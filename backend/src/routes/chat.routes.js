import express from "express";
import { createChat, listChats, getChat, getFullChat, getFullResults, updateChat, deleteChat, clearHistory } from "../controllers/chat.controller.js";
import { addMessage, getMessages } from "../controllers/message.controller.js";
import { requireAuth } from "../middleware/auth.middleware.js";

export const chatRouter = express.Router();

chatRouter.use(requireAuth);
chatRouter.post("/", createChat);
chatRouter.get("/", listChats);
chatRouter.get("/:chatId", getChat);
chatRouter.get("/:chatId/full", getFullChat);
chatRouter.get("/:chatId/full-results", getFullResults);
chatRouter.delete("/clear-history", clearHistory);
chatRouter.put("/:chatId", updateChat);
chatRouter.delete("/:chatId", deleteChat);
chatRouter.post("/:chatId/messages", addMessage);
chatRouter.get("/:chatId/messages", getMessages);
