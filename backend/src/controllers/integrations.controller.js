import { sendTestEmail, checkEmailProvider } from '../services/integrations/resendEmail.service.js';
import { checkStorageProvider, testCloudinaryConnection } from '../services/integrations/storage.service.js';
import { generateImage } from '../services/integrations/imageExecution.service.js';
import { renderVideo, getVideoStatus } from '../services/integrations/videoExecution.service.js';
import { getProviderHealth } from '../services/integrations/providerConfig.service.js';
import { checkImageProviders, testReplicateConnection, testHuggingFaceConnection } from '../services/integrations/image.service.js';
import { checkVideoProvider, testFfmpegConnection } from '../services/integrations/video.service.js';
import { prisma } from '../config/prisma.js';

export async function getHealth(req, res) {
  try {
    const email = await checkEmailProvider();
    const config = getProviderHealth();
    const storage = await checkStorageProvider();

    res.json({
      success: true,
      providers: {
        email: { configured: email.configured, provider: email.provider || null, reason: email.reason || null, fromConfigured: email.fromConfigured ?? null },
        image: {
          pollinations: { configured: true },
          fal: { configured: config.image.fal.configured, model: config.image.fal.model },
          reason: config.image.fal.configured ? 'pollinations_fal_configured' : 'pollinations_only',
        },
        storage: { configured: storage.configured, provider: storage.provider || null, reason: storage.reason || null },
        video: {
          shotstack: { configured: config.video.shotstack.configured, stage: config.video.shotstack.stage },
          creatomate: { configured: config.video.creatomate.configured },
          reason: config.video.shotstack.configured ? 'shotstack_configured' : config.video.creatomate.configured ? 'creatomate_configured' : 'no_video_provider',
        },
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

    const { script, scenes, duration, platform, aspectRatio, prompt } = req.body;

    const result = await renderVideo({ script, scenes, duration, platform, aspectRatio, prompt });

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

export async function getVideoStatusHandler(req, res) {
  try {
    const { provider, renderId } = req.params;
    const result = await getVideoStatus(provider, renderId);
    res.json(result);
  } catch (error) {
    res.status(500).json({ success: false, error: 'Failed to get video status' });
  }
}

export async function debugTestReplicate(req, res) {
  const result = await testReplicateConnection();
  res.json(result);
}

export async function debugTestHuggingFace(req, res) {
  const result = await testHuggingFaceConnection();
  res.json(result);
}

export async function debugTestCloudinary(req, res) {
  const result = await testCloudinaryConnection();
  res.json(result);
}

export async function debugTestFFmpeg(req, res) {
  const result = await testFfmpegConnection();
  res.json(result);
}
