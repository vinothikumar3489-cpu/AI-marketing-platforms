import { Worker } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '../config/redis.js';

let workers = [];

export async function startWorkers() {
  if (workers.length > 0) return;

  if (!isRedisAvailable()) return;
  const connection = getRedisConnection();
  if (!connection) return;

  const workerOptions = { connection, concurrency: 5 };

  const workerDefs = [
    { queue: 'ScrapingQueue', handler: createScrapingHandler() },
    { queue: 'AIQueue', handler: createAIHandler() },
    { queue: 'EmailQueue', handler: createEmailHandler() },
    { queue: 'CRMQueue', handler: createCRMHandler() },
    { queue: 'ReportQueue', handler: createReportHandler() },
  ];

  for (const def of workerDefs) {
    try {
      const worker = new Worker(def.queue, def.handler, workerOptions);
      worker.on('failed', (job, err) => {
        console.error(`❌ [${def.queue}] Job ${job?.id} failed:`, err.message);
      });
      workers.push(worker);
    } catch (err) {
      console.warn(`⚠️ Failed to create worker for "${def.queue}":`, err.message);
    }
  }

  if (workers.length > 0) {
    console.log(`✅ Started ${workers.length} BullMQ worker(s)`);
  }
}

function createScrapingHandler() {
  return async (job) => {
    console.log(`[ScrapingQueue] Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'website-scrape') {
      const { scrapeWebsite } = await import('../domains/research/services/scraper.service.js');
      const result = await scrapeWebsite(job.data);
      if (!result.success) throw new Error(result.error);
      return result;
    }

    if (job.name === 'seo-audit') {
      const { generateCompleteSeoIntelligence } = await import('../domains/seo/services/seoIntelligence.service.js');
      const result = await generateCompleteSeoIntelligence(job.data);
      if (!result.success) throw new Error(result.error);
      return result;
    }

    throw new Error(`Unknown job name: ${job.name}`);
  };
}

function createAIHandler() {
  return async (job) => {
    console.log(`[AIQueue] Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'content-generation') {
      const { generateSingleModule } = await import('../services/execution/marketing-execution.service.js');
      const moduleType = job.data?.moduleType || job.data?.type;
      const context = job.data?.context || job.data;
      if (!moduleType) throw new Error('AI content-generation job missing moduleType');
      return await generateSingleModule(moduleType, context);
    }

    throw new Error(`Unknown AI job name: ${job.name}`);
  };
}

function createEmailHandler() {
  return async (job) => {
    console.log(`[EmailQueue] Processing job ${job.id} of type ${job.name}`);

    if (job.name === 'scheduled-campaign') {
      const { sendCampaignEmail } = await import('../services/email/email-campaign-generator.service.js');
      const prisma = (await import('../config/prisma.js')).default;
      const campaign = await prisma.emailCampaign.findUnique({
        where: { id: job.data.campaignId },
        include: { sequenceItems: { orderBy: { sequenceOrder: 'asc' } } }
      });
      if (!campaign || campaign.status !== 'scheduled') return { status: 'skipped', reason: 'Campaign not found or not scheduled' };

      const recipients = job.data.recipients || [];
      if (recipients.length === 0) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (campaign.audienceSummary && emailRegex.test(campaign.audienceSummary)) {
          recipients.push({ email: campaign.audienceSummary, name: campaign.name || '' });
        } else {
          console.warn(`[EmailWorker] No recipients for scheduled campaign ${campaign.id}`);
          return { status: 'skipped', reason: 'No recipients configured' };
        }
      }

      const results = [];
      for (const item of campaign.sequenceItems) {
        for (const recipient of recipients) {
          const r = await sendCampaignEmail({
            campaignId: job.data.campaignId,
            itemId: item.id,
            recipientEmail: recipient.email,
            recipientName: recipient.name || campaign.name || 'Valued Customer',
            companyName: campaign.name || ''
          });
          results.push(r);
        }
      }

      const allSuccess = results.every(r => r.success);
      await prisma.emailCampaign.update({
        where: { id: job.data.campaignId },
        data: { status: allSuccess ? 'sent' : 'failed', sentAt: new Date() }
      });

      return { success: allSuccess, results };
    }

    if (job.name === 'send-email') {
      const { deliverEmail } = await import('../services/email/email-delivery.service.js');
      const result = await deliverEmail({ ...job.data, useQueue: false });
      if (!result.success) throw new Error(result.error || 'Email send failed');
      return result;
    }

    const { sendEmail } = await import('../services/providers/email/email-provider-registry.js');
    const result = await sendEmail(job.data);
    if (!result.success) throw new Error(result.error || 'Email send failed');
    return result;
  };
}

function createCRMHandler() {
  return async (job) => {
    console.log(`[CRMQueue] Processing job ${job.id} of type ${job.name}`);
    if (job.name === 'execute-workflow') {
      const { executeWorkflow } = await import('../services/automation/crm-workflow.service.js');
      const { chatId, workflowId, triggerContext } = job.data;
      const result = await executeWorkflow(chatId, workflowId, triggerContext);
      return result;
    }
    throw new Error(`Unknown job name: ${job.name}`);
  };
}

function createReportHandler() {
  return async (job) => {
    console.log(`[ReportQueue] Processing job ${job.id} of type ${job.name}`);
    const { chatId, userId, format, reportType } = job.data;

    const { generateExecutiveReport, generateGrowthReport, generateSeoReport } = await import('../services/reporting/report-builder.service.js');
    const fs = await import('fs');
    const path = await import('path');

    let buffer;
    if (reportType === 'executive') {
      buffer = await generateExecutiveReport(chatId, userId, format);
    } else if (reportType === 'growth') {
      buffer = await generateGrowthReport(chatId, userId, format);
    } else if (reportType === 'seo') {
      buffer = await generateSeoReport(chatId, userId, format);
    } else {
      throw new Error(`Unknown reportType: ${reportType}`);
    }

    if (!Buffer.isBuffer(buffer)) buffer = Buffer.from(buffer);

    const reportsDir = path.join(process.cwd(), 'local-assets', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${reportType}_${chatId}_${job.id}.${format}`;
    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, buffer);

    return { status: 'success', url: `/api/local-assets/reports/${filename}`, filename };
  };
}

export async function stopWorkers() {
  if (workers.length === 0) return;
  await Promise.all(workers.map(w => w.close()));
  workers = [];
  console.log('BullMQ workers stopped');
}
