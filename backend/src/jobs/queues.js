import { Queue } from 'bullmq';
import { redisConnection } from '../config/redis.js';

const queueOptions = {
  connection: redisConnection,
  defaultJobOptions: {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 5000,
    },
    removeOnComplete: 100,
    removeOnFail: 1000,
  }
};

export const scrapingQueue = new Queue('ScrapingQueue', queueOptions);
export const aiQueue = new Queue('AIQueue', queueOptions);
export const emailQueue = new Queue('EmailQueue', queueOptions);
export const crmQueue = new Queue('CRMQueue', queueOptions);
export const reportQueue = new Queue('ReportQueue', queueOptions);

export async function closeQueues() {
  await Promise.all([
    scrapingQueue.close(),
    aiQueue.close(),
    emailQueue.close(),
    crmQueue.close(),
    reportQueue.close()
  ]);
}
