import express from 'express';
import { requireAuth } from '../middleware/auth.middleware.js';
import { generateEmailCampaign, sendCampaignEmail, scheduleCampaign, approveCampaign, createRecurringCampaign, listAudienceSegments, createAudienceSegment } from '../services/automation/email-campaign.service.js';
import { prisma } from '../config/prisma.js';

export const emailCampaignRouter = express.Router();
emailCampaignRouter.use(requireAuth);

emailCampaignRouter.post('/:chatId/email-campaign/generate', async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const { planId, campaignPlanId, emailType } = req.body || {};

  if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

  try {
    const result = await generateEmailCampaign({ chatId, userId, planId, campaignPlanId, emailType });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.get('/:chatId/email-campaign', async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;

  if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

  try {
    const campaigns = await prisma.emailCampaign.findMany({
      where: { chatId, userId },
      orderBy: { createdAt: 'desc' },
      include: { sequenceItems: { orderBy: { sequenceOrder: 'asc' } }, logs: { take: 5, orderBy: { createdAt: 'desc' } } }
    });
    return res.json({ success: true, data: campaigns });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.get('/:chatId/email-campaign/:campaignId', async (req, res) => {
  const { chatId, campaignId } = req.params;
  const userId = req.user?.id;

  try {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { id: campaignId, chatId, userId },
      include: {
        sequenceItems: { orderBy: { sequenceOrder: 'asc' } },
        versions: { orderBy: { versionNumber: 'desc' } },
        logs: { orderBy: { createdAt: 'desc' }, take: 20 }
      }
    });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    return res.json({ success: true, data: campaign });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/approve', async (req, res) => {
  const { campaignId } = req.params;

  try {
    const result = await approveCampaign(campaignId);
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/schedule', async (req, res) => {
  const { campaignId } = req.params;
  const { scheduledDate } = req.body || {};

  if (!scheduledDate) return res.status(400).json({ success: false, error: 'scheduledDate required' });

  try {
    const result = await scheduleCampaign({ campaignId, scheduledDate });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/save-draft', async (req, res) => {
  const { chatId } = req.params;
  const userId = req.user?.id;
  const { emailData } = req.body || {};

  if (!chatId || !userId) return res.status(400).json({ success: false, error: 'Missing chatId or user' });

  try {
    const campaign = await prisma.emailCampaign.findFirst({
      where: { chatId, userId },
      orderBy: { createdAt: 'desc' }
    });

    if (!campaign) {
      const newCampaign = await prisma.emailCampaign.create({
        data: {
          chatId, userId,
          name: emailData?.subjectLine ? `Draft: ${emailData.subjectLine}` : 'New Draft',
          status: 'draft',
          campaignPlanId: req.body.campaignPlanId || null
        }
      });
      return res.json({ success: true, data: newCampaign });
    }

    const result = await prisma.emailCampaign.update({
      where: { id: campaign.id },
      data: {
        status: 'draft',
        updatedAt: new Date(),
        sequenceItems: emailData ? {
          deleteMany: {},
          create: [{
            sequenceOrder: 1,
            emailName: emailData.subjectLine || 'Draft Email',
            subjectLine: emailData.subjectLine || '',
            previewText: emailData.previewText || '',
            emailBodyText: emailData.plainTextBody || emailData.body || '',
            emailBodyHtml: emailData.htmlBody || '',
            primaryCta: emailData.cta || '',
            purpose: 'campaign',
            inferenceStatus: 'DRAFT'
          }]
        } : undefined
      }
    });
    return res.json({ success: true, data: result });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/send-test', async (req, res) => {
  const { campaignId } = req.params;
  const { recipientEmail, recipientName, companyName } = req.body || {};

  if (!recipientEmail) return res.status(400).json({ success: false, error: 'recipientEmail required' });

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { sequenceItems: { take: 1, orderBy: { sequenceOrder: 'asc' } } }
    });
    if (!campaign || !campaign.sequenceItems[0]) return res.status(404).json({ success: false, error: 'Campaign or email item not found' });

    const result = await sendCampaignEmail({
      campaignId,
      itemId: campaign.sequenceItems[0].id,
      recipientEmail,
      recipientName: recipientName || 'Test User',
      companyName: companyName || campaign.name
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

// Alias route matching frontend path
emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/test-send', async (req, res) => {
  const { campaignId } = req.params;
  const { recipientEmail, recipientName, companyName } = req.body || {};

  if (!recipientEmail) return res.status(400).json({ success: false, error: 'recipientEmail required' });

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { sequenceItems: { take: 1, orderBy: { sequenceOrder: 'asc' } } }
    });
    if (!campaign || !campaign.sequenceItems[0]) return res.status(404).json({ success: false, error: 'Campaign or email item not found' });

    const result = await sendCampaignEmail({
      campaignId,
      itemId: campaign.sequenceItems[0].id,
      recipientEmail,
      recipientName: recipientName || 'Test User',
      companyName: companyName || campaign.name
    });

    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/send', async (req, res) => {
  const { campaignId } = req.params;

  try {
    const campaign = await prisma.emailCampaign.findUnique({
      where: { id: campaignId },
      include: { sequenceItems: { orderBy: { sequenceOrder: 'asc' } } }
    });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });
    if (!campaign.sequenceItems || campaign.sequenceItems.length === 0) return res.status(400).json({ success: false, error: 'No sequence items to send' });

    const results = [];
    for (const item of campaign.sequenceItems) {
      const result = await sendCampaignEmail({
        campaignId,
        itemId: item.id,
        recipientEmail: campaign.audienceSummary || '',
        recipientName: campaign.name || 'Valued Customer',
        companyName: campaign.name || ''
      });
      results.push(result);
    }

    const allSuccess = results.every(r => r.success);
    const sentCount = results.filter(r => r.success).length;

    await prisma.emailCampaign.update({
      where: { id: campaignId },
      data: { status: allSuccess ? 'sent' : 'failed', sentAt: new Date() }
    }).catch(() => {});

    return res.json({ success: allSuccess, sentCount, totalRecipients: results.length, results });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/items/:itemId/send', async (req, res) => {
  const { campaignId, itemId } = req.params;
  const { recipientEmail, recipientName, companyName } = req.body || {};

  if (!recipientEmail) return res.status(400).json({ success: false, error: 'recipientEmail required' });

  try {
    const result = await sendCampaignEmail({ campaignId, itemId, recipientEmail, recipientName, companyName });
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/items/:itemId/regenerate', async (req, res) => {
  const { chatId, campaignId, itemId } = req.params;
  const userId = req.user?.id;

  try {
    const campaign = await prisma.emailCampaign.findUnique({ where: { id: campaignId } });
    if (!campaign) return res.status(404).json({ success: false, error: 'Campaign not found' });

    const result = await generateEmailCampaign({ chatId, userId, planId: campaign.campaignPlanId, emailType: 'regenerate' });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.put('/:chatId/email-campaign/:campaignId/items/:itemId', async (req, res) => {
  const { campaignId, itemId } = req.params;
  const updates = req.body || {};

  try {
    const item = await prisma.emailSequenceItem.update({
      where: { id: itemId },
      data: {
        subjectLine: updates.subjectLine,
        previewText: updates.previewText,
        emailBodyText: updates.emailBodyText,
        emailBodyHtml: updates.emailBodyHtml,
        primaryCta: updates.primaryCta,
        status: updates.status || 'draft',
        updatedAt: new Date()
      }
    });
    return res.json({ success: true, data: item });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/:campaignId/recurring', async (req, res) => {
  const { chatId, campaignId } = req.params;
  const userId = req.user?.id;
  const { name, recurrence, listIds, senderId } = req.body || {};

  try {
    const result = await createRecurringCampaign({ chatId, userId, campaignId, name, recurrence, listIds, senderId });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.get('/:chatId/email-campaign/segments', async (req, res) => {
  try {
    const result = await listAudienceSegments();
    return res.json(result);
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

emailCampaignRouter.post('/:chatId/email-campaign/segments', async (req, res) => {
  const { segmentName, conditions } = req.body || {};
  if (!segmentName) return res.status(400).json({ success: false, error: 'segmentName required' });

  try {
    const result = await createAudienceSegment({ segmentName, conditions });
    if (!result.success) return res.status(500).json({ success: false, error: result.error });
    return res.json({ success: true, data: result.data });
  } catch (error) {
    return res.status(500).json({ success: false, error: error.message });
  }
});

export const brevoWebhookRouter = express.Router();

brevoWebhookRouter.post('/brevo', async (req, res) => {
  try {
    const event = req.body;
    if (!event?.event) return res.status(400).json({ success: false, error: 'Invalid webhook payload' });

    const logEntry = await prisma.emailCampaignLog.create({
      data: {
        id: undefined,
        action: `webhook_${event.event}`,
        status: event.event === 'delivered' ? 'delivered' : event.event === 'open' ? 'opened' : event.event === 'click' ? 'clicked' : event.event === 'hard_bounce' ? 'bounced' : event.event === 'unsubscribe' ? 'unsubscribed' : event.event === 'complaint' ? 'complained' : 'unknown',
        message: event.message || event.event,
        metadata: event
      }
    }).catch(() => null);

    await prisma.emailDeliveryLog.updateMany({
      where: { providerMessageId: event.messageId || event.smtpId || '' },
      data: {
        status: event.event === 'delivered' ? 'delivered' : event.event === 'open' ? 'opened' : event.event === 'click' ? 'clicked' : event.event === 'hard_bounce' ? 'bounced' : event.event === 'soft_bounce' ? 'bounced' : event.event === 'unsubscribe' ? 'unsubscribed' : event.event === 'complaint' ? 'spam' : 'unknown',
        ...(event.event === 'delivered' ? { deliveredAt: new Date() } : {}),
        ...(event.event === 'open' ? { openedAt: new Date() } : {}),
        ...(event.event === 'click' ? { clickedAt: new Date() } : {})
      }
    }).catch(() => {});

    return res.status(200).json({ received: true });
  } catch (error) {
    console.error('[BrevoWebhook] Error:', error);
    return res.status(200).json({ received: true });
  }
});
