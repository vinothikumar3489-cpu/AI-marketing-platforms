import { prisma } from '../config/prisma.js';
import { crmQueue } from './queues.js';

let intervalId = null;

export async function checkScheduledWorkflows() {
  try {
    const workflows = await prisma.cRMWorkflow.findMany({
      where: {
        status: 'ACTIVE',
        triggerType: 'DATE_REACHED',
      }
    });

    for (const workflow of workflows) {
      const config = workflow.triggerConfig || {};
      
      if (config.targetDate) {
        const targetDate = new Date(config.targetDate);
        if (targetDate <= new Date()) {
          const idempotencyKey = `scheduled_${workflow.id}_${targetDate.toISOString()}`;
          
          const existingExecution = await prisma.cRMWorkflowExecution.findFirst({
            where: { workflowId: workflow.id, idempotencyKey }
          });

          if (!existingExecution) {
            console.log(`[Scheduler] Triggering scheduled workflow: ${workflow.id}`);
            await crmQueue.add('execute-workflow', {
              chatId: workflow.chatId,
              workflowId: workflow.id,
              triggerContext: { 
                isScheduled: true, 
                targetDate: config.targetDate,
                idempotencyKey 
              },
            });
          }
        }
      }
    }
  } catch (error) {
    console.error('[Scheduler] Error checking scheduled workflows:', error);
  }
}

export function startScheduler() {
  if (intervalId) return;
  // Run every 60 seconds
  intervalId = setInterval(checkScheduledWorkflows, 60 * 1000);
  console.log('[Scheduler] Background scheduler started.');
}

export function stopScheduler() {
  if (intervalId) {
    clearInterval(intervalId);
    intervalId = null;
    console.log('[Scheduler] Background scheduler stopped.');
  }
}
