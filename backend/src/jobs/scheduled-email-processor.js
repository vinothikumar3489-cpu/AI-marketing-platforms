import prisma from '../config/prisma.js';
import { sendEmail } from '../services/providers/email/email-provider-registry.js';
import { generateEmailHtmlTemplate } from '../services/email/email-html-generator.service.js';

let processorInterval = null;
const POLL_INTERVAL_MS = 60000;

export function startScheduledEmailProcessor() {
  if (processorInterval) {
    console.log('[ScheduledEmailProcessor] Already running');
    return;
  }

  console.log('[ScheduledEmailProcessor] Starting...');
  
  processScheduledEmails().catch(err => {
    console.error('[ScheduledEmailProcessor] Initial run failed:', err.message);
  });

  processorInterval = setInterval(() => {
    processScheduledEmails().catch(err => {
      console.error('[ScheduledEmailProcessor] Processing failed:', err.message);
    });
  }, POLL_INTERVAL_MS);

  console.log(`[ScheduledEmailProcessor] Started (checking every ${POLL_INTERVAL_MS / 1000}s)`);
}

export function stopScheduledEmailProcessor() {
  if (processorInterval) {
    clearInterval(processorInterval);
    processorInterval = null;
    console.log('[ScheduledEmailProcessor] Stopped');
  }
}

async function processScheduledEmails() {
  try {
    const now = new Date();
    
    const dueSchedules = await prisma.emailSchedule.findMany({
      where: {
        status: 'pending',
        nextRunAt: {
          lte: now
        }
      },
      include: {
        campaign: {
          include: {
            sequenceItems: true
          }
        },
        automation: true
      },
      take: 50
    });

    if (dueSchedules.length === 0) {
      return;
    }

    console.log(`[ScheduledEmailProcessor] Found ${dueSchedules.length} due schedules`);

    for (const schedule of dueSchedules) {
      try {
        await processSchedule(schedule);
      } catch (err) {
        console.error(`[ScheduledEmailProcessor] Failed to process schedule ${schedule.id}:`, err.message);
        
        await prisma.emailSchedule.update({
          where: { id: schedule.id },
          data: {
            status: 'failed',
            lastRunAt: new Date()
          }
        }).catch(e => console.error('Failed to update schedule status:', e.message));
      }
    }
  } catch (err) {
    console.error('[ScheduledEmailProcessor] Error finding due schedules:', err.message);
  }
}

async function processSchedule(schedule) {
  console.log(`[ScheduledEmailProcessor] Processing schedule ${schedule.id}`);

  await prisma.emailSchedule.update({
    where: { id: schedule.id },
    data: { status: 'running', lastRunAt: new Date() }
  });

  if (schedule.campaign) {
    await processCampaignSchedule(schedule);
  } else if (schedule.automation) {
    await processAutomationSchedule(schedule);
  } else {
    console.warn(`[ScheduledEmailProcessor] Schedule ${schedule.id} has no campaign or automation`);
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: { status: 'failed' }
    });
    return;
  }

  const nextRunAt = calculateNextRunTime(schedule);
  
  if (nextRunAt && schedule.repeatCount && schedule.repeatCount > 1) {
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: {
        status: 'pending',
        nextRunAt,
        repeatCount: schedule.repeatCount - 1
      }
    });
  } else {
    await prisma.emailSchedule.update({
      where: { id: schedule.id },
      data: {
        status: 'completed',
        completedAt: new Date()
      }
    });
  }
}

async function processCampaignSchedule(schedule) {
  const campaign = schedule.campaign;
  
  if (!campaign.sequenceItems || campaign.sequenceItems.length === 0) {
    throw new Error('Campaign has no email sequence items');
  }

  const recipients = parseRecipients(campaign.audienceSummary);
  
  if (recipients.length === 0) {
    throw new Error('No recipients found for campaign');
  }

  for (const item of campaign.sequenceItems) {
    for (const recipient of recipients) {
      try {
        const html = item.emailBodyHtml || generateEmailHtmlTemplate({
          subject: item.subjectLine,
          previewText: item.previewText,
          bodyParagraphs: [item.emailBodyText],
          callToAction: { label: 'Learn More', url: item.primaryCta || '#' }
        });

        const result = await sendEmail({
          to: recipient.email,
          subject: item.subjectLine,
          html,
          text: item.emailBodyText,
          tags: ['scheduled', 'campaign', campaign.id],
          metadata: {
            campaignId: campaign.id,
            sequenceItemId: item.id,
            scheduleId: schedule.id
          }
        });

        await prisma.emailDeliveryLog.create({
          data: {
            emailCampaignId: campaign.id,
            emailSequenceItemId: item.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name,
            provider: result.provider || 'unknown',
            providerMessageId: result.providerMessageId,
            subjectLine: item.subjectLine,
            status: result.success ? 'sent' : 'failed',
            errorMessage: result.error?.message,
            sentAt: result.success ? new Date() : null
          }
        }).catch(e => console.error('Failed to log delivery:', e.message));

      } catch (err) {
        console.error(`Failed to send to ${recipient.email}:`, err.message);
      }
    }
  }
}

async function processAutomationSchedule(schedule) {
  const automation = schedule.automation;
  
  const { executeWorkflow } = await import('../services/automation/crm-workflow.service.js');
  
  await executeWorkflow(automation.chatId, automation.id, {
    triggerType: 'schedule',
    scheduleId: schedule.id,
    timestamp: new Date()
  });
}

function calculateNextRunTime(schedule) {
  if (schedule.scheduleType === 'once') {
    return null;
  }

  const now = new Date();
  const interval = schedule.repeatInterval || 1;

  switch (schedule.scheduleType) {
    case 'daily':
      return new Date(now.getTime() + 24 * 60 * 60 * 1000);
    
    case 'weekly':
      return new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
    
    case 'monthly':
      const next = new Date(now);
      next.setMonth(next.getMonth() + 1);
      return next;
    
    case 'custom':
      return new Date(now.getTime() + interval * 24 * 60 * 60 * 1000);
    
    default:
      return null;
  }
}

function parseRecipients(audienceSummary) {
  if (!audienceSummary) return [];

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (emailRegex.test(audienceSummary)) {
    return [{ email: audienceSummary, name: '' }];
  }

  const emails = audienceSummary.split(',').map(e => e.trim()).filter(e => emailRegex.test(e));
  if (emails.length > 0) {
    return emails.map(email => ({ email, name: '' }));
  }

  console.warn(`[ScheduledEmailProcessor] audienceSummary "${audienceSummary}" contains no valid email addresses. Campaign may have a text description instead of recipient list.`);
  return [];
}
