
import { runAIAssistant } from './agents.service.js';
import { prisma } from '../../config/prisma.js';

export const runAgentHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const { userMessage } = req.body || {};

  if (!chatId || !userId || !userMessage) {
    return res.status(400).json({ success: false, error: 'Missing required parameters' });
  }

  try {
    const existingChat = await prisma.chat.findUnique({ where: { id: chatId } });
    if (!existingChat) {
      await prisma.chat.update({
        where: { id: chatId },
        data: { updatedAt: new Date() }
      });
    }
    const out = await runAIAssistant({ chatId, userId, userMessage });
    if (!out.success) {
      return res.status(400).json({ success: false, ...out });
    }
    return res.json(out.data);
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: e.message });
  }
};

export const getAgentsHandler = async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  try {
    // Verify chat ownership first
    const chat = await prisma.chat.findFirst({
      where: { id: chatId, userId }
    });
    if (!chat) {
      return res.status(404).json({ success: false, error: 'Chat not found' });
    }
    
    const messages = await prisma.message.findMany({
      where: { chatId },
      orderBy: { createdAt: 'asc' }
    });
    return res.json({ success: true, messages });
  } catch (e) {
    console.error(e);
    return res.status(500).json({ success: false, error: e.message });
  }
};
