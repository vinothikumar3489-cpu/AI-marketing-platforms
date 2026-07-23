import { Worker } from 'bullmq';
import { redisConnection } from '../config/redis.js';

// Import handlers for specific tasks
import { scrapeWebsite } from '../domains/research/services/scraper.service.js';
import { generateCompleteSeoIntelligence } from '../domains/seo/services/seoIntelligence.service.js';
import { executeWorkflow } from '../services/automation/crm-workflow.service.js';
import { generateExecutiveReport, generateGrowthReport, generateSeoReport } from '../services/reporting/report-builder.service.js';
import fs from 'fs';
import path from 'path';

const workerOptions = {
  connection: redisConnection,
  concurrency: 5,
};

export const scrapingWorker = new Worker('ScrapingQueue', async (job) => {
  console.log(`[ScrapingQueue] Processing job ${job.id} of type ${job.name}`);
  
  if (job.name === 'website-scrape') {
    const result = await scrapeWebsite(job.data);
    if (!result.success) throw new Error(result.error);
    return result;
  }
  
  if (job.name === 'seo-audit') {
    const result = await generateCompleteSeoIntelligence(job.data);
    if (!result.success) throw new Error(result.error);
    return result;
  }
  
  throw new Error(`Unknown job name: ${job.name}`);
}, workerOptions);

export const aiWorker = new Worker('AIQueue', async (job) => {
  console.log(`[AIQueue] Processing job ${job.id}`);
  // await handleAiJob(job.data);
  return { status: 'success' };
}, workerOptions);

export const emailWorker = new Worker('EmailQueue', async (job) => {
  console.log(`[EmailQueue] Processing job ${job.id}`);
  return { status: 'success' };
}, workerOptions);

export const crmWorker = new Worker('CRMQueue', async (job) => {
  console.log(`[CRMQueue] Processing job ${job.id} of type ${job.name}`);
  
  if (job.name === 'execute-workflow') {
    const { chatId, workflowId, triggerContext } = job.data;
    try {
      const result = await executeWorkflow(chatId, workflowId, triggerContext);
      return result;
    } catch (error) {
      throw new Error(`Workflow execution failed: ${error.message}`);
    }
  }

  throw new Error(`Unknown job name: ${job.name}`);
}, workerOptions);

export const reportWorker = new Worker('ReportQueue', async (job) => {
  console.log(`[ReportQueue] Processing job ${job.id} of type ${job.name}`);
  const { chatId, userId, format, reportType } = job.data;

  try {
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

    // Save to local-assets/reports
    const reportsDir = path.join(process.cwd(), 'local-assets', 'reports');
    if (!fs.existsSync(reportsDir)) {
      fs.mkdirSync(reportsDir, { recursive: true });
    }

    const filename = `${reportType}_${chatId}_${job.id}.${format}`;
    const filePath = path.join(reportsDir, filename);
    fs.writeFileSync(filePath, buffer);

    return { 
      status: 'success', 
      url: `/api/local-assets/reports/${filename}`,
      filename
    };
  } catch (error) {
    throw new Error(`Report generation failed: ${error.message}`);
  }
}, workerOptions);

// Error handling
[scrapingWorker, aiWorker, emailWorker, crmWorker, reportWorker].forEach(worker => {
  worker.on('failed', (job, err) => {
    console.error(`❌ [${worker.name}] Job ${job?.id} failed:`, err.message);
  });
});

export async function closeWorkers() {
  await Promise.all([
    scrapingWorker.close(),
    aiWorker.close(),
    emailWorker.close(),
    crmWorker.close(),
    reportWorker.close()
  ]);
}
