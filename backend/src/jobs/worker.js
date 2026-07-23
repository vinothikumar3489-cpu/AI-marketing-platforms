import { Worker } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '../config/redis.js';

let workers = [];

export async function startWorkers() {
  if (workers.length > 0) return;

  if (!isRedisAvailable()) {
    console.warn('⚠️ Redis not available — BullMQ workers disabled');
    return;
  }

  const connection = getRedisConnection();
  if (!connection) {
    console.warn('⚠️ Cannot start workers — no Redis connection');
    return;
  }

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
    console.log(`[AIQueue] Processing job ${job.id}`);
    return { status: 'success' };
  };
}

function createEmailHandler() {
  return async (job) => {
    console.log(`[EmailQueue] Processing job ${job.id}`);
    return { status: 'success' };
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
