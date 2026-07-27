import express from 'express';
import { getAiQueue, getScrapingQueue, getEmailQueue, getCrmQueue } from '../jobs/queues.js';
import { requireAuth } from '../middleware/auth.middleware.js';

export const jobsRouter = express.Router();

jobsRouter.use(requireAuth);

jobsRouter.get('/:queueName/:jobId/status', async (req, res) => {
  const { queueName, jobId } = req.params;
  
  let queue;
  switch (queueName) {
    case 'ai': queue = getAiQueue(); break;
    case 'scraping': queue = getScrapingQueue(); break;
    case 'email': queue = getEmailQueue(); break;
    case 'crm': queue = getCrmQueue(); break;
    default: return res.status(400).json({ error: 'Invalid queue name' });
  }

  if (!queue) return res.status(503).json({ error: 'Queue not available — Redis may be unavailable' });

  try {
    const job = await queue.getJob(jobId);
    if (!job) {
      return res.status(404).json({ error: 'Job not found' });
    }

    const state = await job.getState();
    const progress = job.progress;
    const result = job.returnvalue;
    const failedReason = job.failedReason;

    res.json({
      id: job.id,
      state,
      progress,
      result,
      failedReason,
    });
  } catch (error) {
    console.error('Error fetching job status:', error);
    res.status(500).json({ error: 'Failed to fetch job status' });
  }
});
