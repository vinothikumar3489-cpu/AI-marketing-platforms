import { z } from "zod";
import { prisma } from "../config/prisma.js";
import { generateAnalysis } from "../services/analysis.service.js";

const analysisSchema = z.object({
  chatId: z.string().optional(),
  productName: z.string().min(1),
  productDescription: z.string().min(1),
  targetAudience: z.string().min(1),
  followUpQuestion: z.string().optional(),
});

export const analyzeProduct = async (req, res) => {
  const parseResult = analysisSchema.safeParse(req.body);
  if (!parseResult.success) {
    return res.status(400).json({ success: false, error: parseResult.error.errors[0].message });
  }

  const { chatId, productName, productDescription, targetAudience, followUpQuestion } = parseResult.data;

  let chat = null;
  if (chatId) {
    chat = await prisma.chat.findFirst({ where: { id: chatId, userId: req.user.id } });
    if (!chat) {
      return res.status(404).json({ success: false, error: "Chat not found" });
    }
  }

  const analysisResult = await generateAnalysis({ productName, productDescription, targetAudience, followUpQuestion });

  if (!chat) {
    chat = await prisma.chat.create({
      data: {
        userId: req.user.id,
        title: productName,
        productName,
      },
    });
  } else {
    await prisma.chat.update({ where: { id: chat.id }, data: { title: productName, productName } });
  }

  const userMessage = await prisma.message.create({
    data: {
      chatId: chat.id,
      role: "user",
      content: followUpQuestion || `Analyze product: ${productDescription}`,
    },
  });

  await prisma.analysis.create({
    data: {
      chatId: chat.id,
      userId: req.user.id,
      productName,
      productDescription,
      targetAudience,
      marketInsights: analysisResult.structured.marketInsights,
      competitorInsights: analysisResult.structured.competitorInsights,
      campaignSuggestions: analysisResult.structured.campaignSuggestions,
      roiSuggestions: analysisResult.structured.roiSuggestions,
    },
  });

  await prisma.notification.create({
    data: {
      userId: req.user.id,
      title: "Product Analysis completed",
      message: `${productName} analysis was saved successfully.`,
      type: "analysis",
    },
  });

  const assistantMessage = await prisma.message.create({
    data: {
      chatId: chat.id,
      role: "assistant",
      content: analysisResult.message,
      analysisData: analysisResult.structured,
    },
  });

  return res.json({
    chat,
    analysis: analysisResult.structured,
    messages: [userMessage, assistantMessage],
  });
};
