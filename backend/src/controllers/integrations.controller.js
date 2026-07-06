import { sendTestEmail, checkEmailProvider } from '../services/integrations/email.service.js';
import { checkStorageProvider } from '../services/integrations/storage.service.js';
import { generateImage, checkImageProviders } from '../services/integrations/image.service.js';
import { renderVideo, checkVideoProvider } from '../services/integrations/video.service.js';
import { prisma } from '../config/prisma.js';

export async function getHealth(req, res) {
  try {
    const email = await checkEmailProvider();
    const image = await checkImageProviders();
    const storage = await checkStorageProvider();
    const video = await checkVideoProvider();

    res.json({
      success: true,
      providers: {
        email: { configured: email.configured, provider: email.provider || null },
        image: { huggingface: image.huggingface, replicate: image.replicate },
        storage: { cloudinary: storage.configured },
        video: { configured: video.configured, provider: video.provider || null },
        ai: { gemini: !!process.env.GEMINI_API_KEY, groq: !!process.env.GROQ_API_KEY },
      },
    });
  } catch (error) {
    console.error('[IntegrationsHealth] Error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to check provider health' });
  }
}

export async function sendEmail(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const { recipientEmail, subject, body, approvalChecked, senderName } = req.body;

    const result = await sendTestEmail({ recipientEmail, subject, body, senderName, approvalChecked });

    if (result.success) {
      await prisma.automationLog.create({
        data: {
          userId, chatId,
          action: 'email_sent',
          message: `Test email sent via ${result.provider} to ${result.recipient}`,
          metadata: { provider: result.provider, messageId: result.messageId, recipient: result.recipient },
        },
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Integrations] Send email error:', error.message);
    res.status(500).json({ success: false, error: 'Email sending failed', details: 'Internal server error' });
  }
}

export async function generatePosterImage(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const { prompt, headline, cta, platform, dimensions, brandColors } = req.body;

    const result = await generateImage({ prompt, headline, cta, platform, dimensions, brandColors });

    if (result.success) {
      await prisma.automationLog.create({
        data: {
          userId, chatId,
          action: 'poster_generated',
          message: `Poster generated via ${result.provider}`,
          metadata: { provider: result.provider, imageUrl: result.imageUrl, prompt: result.prompt },
        },
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Integrations] Generate image error:', error.message);
    res.status(500).json({ success: false, error: 'Image generation failed', details: 'Internal server error' });
  }
}

export async function renderVideoHandler(req, res) {
  try {
    const { chatId } = req.params;
    const userId = req.user.id;

    const chat = await prisma.chat.findFirst({ where: { id: chatId, userId } });
    if (!chat) return res.status(404).json({ success: false, error: 'Chat not found' });

    const { script, scenes, duration, platform, aspectRatio } = req.body;

    const result = await renderVideo({ script, scenes, duration, platform, aspectRatio });

    if (result.success) {
      await prisma.automationLog.create({
        data: {
          userId, chatId,
          action: 'video_rendered',
          message: `Video rendered via ${result.provider}`,
          metadata: { provider: result.provider, videoUrl: result.videoUrl, duration: result.duration },
        },
      });
    }

    res.json(result);
  } catch (error) {
    console.error('[Integrations] Render video error:', error.message);
    res.status(500).json({ success: false, error: 'Video rendering failed', details: 'Internal server error' });
  }
}
