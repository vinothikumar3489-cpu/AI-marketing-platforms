import { Queue } from 'bullmq';
import { getRedisConnection, isRedisAvailable } from '../config/redis.js';

const queueRegistry = {};

function getQueueOptions() {
  const conn = getRedisConnection();
  if (!conn) return null;

  return {
    connection: conn,
    defaultJobOptions: {
      attempts: 3,
      backoff: { type: 'exponential', delay: 5000 },
      removeOnComplete: 100,
      removeOnFail: 1000,
    },
  };
}

export function getQueue(name) {
  if (queueRegistry[name]) return queueRegistry[name];

  const opts = getQueueOptions();
  if (!opts) {
    console.warn(`⚠️ Cannot create queue "${name}" — Redis not available`);
    return null;
  }

  try {
    const queue = new Queue(name, opts);
    queueRegistry[name] = queue;
    return queue;
  } catch (err) {
    console.warn(`⚠️ Failed to create queue "${name}":`, err.message);
    return null;
  }
}

export function getScrapingQueue() { return getQueue('ScrapingQueue'); }
export function getAiQueue() { return getQueue('AIQueue'); }
export function getEmailQueue() { return getQueue('EmailQueue'); }
export function getCrmQueue() { return getQueue('CRMQueue'); }
export function getReportQueue() { return getQueue('ReportQueue'); }

export async function closeQueues() {
  const queues = Object.values(queueRegistry);
  if (queues.length === 0) return;
  await Promise.all(queues.map(q => q.close()));
}

export { isRedisAvailable };
