import { sendTestEmail, checkEmailProvider } from '../services/integrations/email/email-service-legacy.js';
import { checkStorageProvider, testCloudinaryConnection } from '../services/integrations/storage.service.js';
import { generateImage } from '../services/integrations/imageExecution.service.js';
import { renderVideo, getVideoStatus } from '../services/integrations/videoExecution.service.js';
import { getProviderHealth } from '../services/integrations/providerConfig.service.js';
import { checkImageProviders, testPollinationsConnection, testFalConnection } from '../services/integrations/image.service.js';
import { checkVideoProvider, testShotstackConnection, testCreatomateConnection } from '../services/integrations/video.service.js';
import { prisma } from '../config/prisma.js';

export async function getHealth(req, res) {
  try {
    const email = await checkEmailProvider();
    const config = getProviderHealth();
    const storage = await checkStorageProvider();

    const vidShotstack = config.video.shotstack.configured;
    const vidCreatomate = config.video.creatomate.configured;
    const vidCloudinary = config.video.cloudinary.configured;

    res.json({
      success: true,
      providers: {
        email: { provider: email.provider || 'gmail', configured: email.configured, smtpUserConfigured: email.smtpUserConfigured ?? false, smtpPassConfigured: email.smtpPassConfigured ?? false, smtpPassLength: email.smtpPassLength ?? 0, from: email.from ?? null, port587: email.port587 ?? (process.env.SMTP_USER ? 'unknown' : 'unknown'), port465: email.port465 ?? (process.env.SMTP_USER ? 'unknown' : 'unknown') },
        image: {
          pollinations: { configured: true },
          fal: { configured: config.image.fal.configured, model: config.image.fal.model },
          cloudinary: { configured: config.image.cloudinary.configured },
          reason: config.image.fal.configured ? 'pollinations_fal_configured' : 'pollinations_only',
        },
        storage: { configured: storage.configured, provider: storage.provider || null, reason: storage.reason || null },
        video: {
          shotstack: { configured: vidShotstack, stage: config.video.shotstack.stage },
          creatomate: { configured: vidCreatomate },
          cloudinary: { configured: vidCloudinary },
          storyboardFallback: { configured: true },
          reason: vidShotstack ? 'shotstack_configured' : vidCreatomate ? 'creatomate_configured' : 'storyboard_fallback',
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
          message: `Test email sent via ${result.provider} to ${result.maskedRecipient || result.recipient}`,
          metadata: { provider: result.provider, messageId: result.messageId, recipient: result.maskedRecipient || result.recipient },
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

    const { prompt, headline, cta, platform, dimensions, brandColors, audience } = req.body;

    const result = await generateImage({ prompt, headline, cta, platform, dimensions, brandColors, audience });

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

export async function debugTestPollinations(req, res) {
  const result = await testPollinationsConnection();
  res.json(result);
}

export async function debugTestFal(req, res) {
  const result = await testFalConnection();
  res.json(result);
}

export async function debugTestCloudinary(req, res) {
  const result = await testCloudinaryConnection();
  res.json(result);
}

export async function debugTestShotstack(req, res) {
  const result = await testShotstackConnection();
  res.json(result);
}

export async function debugTestCreatomate(req, res) {
  const result = await testCreatomateConnection();
  res.json(result);
}

/**
 * Handle Brevo webhook events for email delivery tracking
 */
export async function handleBrevoWebhook(req, res) {
  try {
    const webhookSecret = process.env.BREVO_WEBHOOK_SECRET;
    
    // Verify webhook secret if configured
    if (webhookSecret) {
      const providedSecret = req.headers['x-webhook-secret'] || req.headers['x-brevo-signature'];
      if (providedSecret !== webhookSecret) {
        console.warn('[Brevo Webhook] Invalid webhook secret');
        return res.status(401).json({ success: false, error: 'Invalid webhook secret' });
      }
    }

    const eventData = req.body;
    const eventType = eventData.event || eventData.type;
    const messageId = eventData.messageId || eventData['message-id'];
    const recipientEmail = eventData.email || eventData.recipient?.email;

    if (!eventType || !messageId) {
      console.warn('[Brevo Webhook] Missing required fields:', { eventType, messageId });
      return res.status(400).json({ success: false, error: 'Missing required fields' });
    }

    // Map Brevo event types to our status
    const statusMap = {
      'delivered': 'DELIVERED',
      'opened': 'OPENED',
      'click': 'CLICKED',
      'bounce': 'BOUNCED',
      'spam': 'SPAM',
      'blocked': 'BLOCKED',
      'invalid_email': 'FAILED',
      'deferred': 'QUEUED',
      'sent': 'SENT',
      'request': 'QUEUED'
    };

    const mappedStatus = statusMap[eventType] || 'UNKNOWN';

    // Update delivery status in database
    try {
      // Find delivery record by Brevo message ID
      const delivery = await prisma.emailDelivery.findFirst({
        where: { brevoMessageId: messageId },
        include: { recipient: true, template: true }
      });

      if (delivery) {
        const updateData = {
          status: mappedStatus,
          updatedAt: new Date()
        };

        // Update timestamp based on event type
        if (eventType === 'delivered') updateData.deliveredAt = new Date();
        if (eventType === 'opened') updateData.openedAt = new Date();
        if (eventType === 'click') updateData.clickedAt = new Date();
        if (eventType === 'bounce') updateData.bouncedAt = new Date();
        if (eventType === 'sent') updateData.sentAt = new Date();

        // Update error information for failed events
        if (eventType === 'bounce' || eventType === 'blocked' || eventType === 'invalid_email') {
          updateData.errorMessage = eventData.reason || eventData.message || 'Delivery failed';
          updateData.errorCategory = eventData.category || 'provider_error';
        }

        await prisma.emailDelivery.update({
          where: { id: delivery.id },
          data: updateData
        });

        // Also update recipient status
        await prisma.emailRecipient.update({
          where: { id: delivery.recipientId },
          data: { status: mappedStatus }
        });

        console.log(`[Brevo Webhook] Updated delivery ${delivery.id} to ${mappedStatus} for ${recipientEmail}`);
      } else {
        console.warn(`[Brevo Webhook] No delivery record found for message ID: ${messageId}`);
      }
    } catch (dbError) {
      console.error('[Brevo Webhook] Database update error:', dbError.message);
      // Still return 200 to prevent Brevo from retrying
    }

    // Return 200 to acknowledge receipt
    return res.status(200).json({ success: true, message: 'Webhook processed' });
  } catch (error) {
    console.error('[Brevo Webhook] Processing error:', error.message);
    return res.status(500).json({ success: false, error: 'Webhook processing failed' });
  }
}
