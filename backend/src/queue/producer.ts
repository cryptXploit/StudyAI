import { Queue, JobsOptions } from 'bullmq';
import { connection } from './connection';
import { getCurrentTraceId } from '../core/tracing';

// Dictionary of queues to reuse them
const queues: Record<string, Queue> = {};

export function getQueue(queueName: string): Queue {
  if (!queues[queueName]) {
    queues[queueName] = new Queue(queueName, { connection: connection as any });
  }
  return queues[queueName];
}

/**
 * Standard producer to add a background job.
 * Automatically attaches current request trace id (if any) into job payload as `_traceId`.
 */
export async function addJob(
  queueName: string,
  jobName: string,
  data: any,
  options?: JobsOptions
) {
  const queue = getQueue(queueName);

  // Attach trace id from AsyncLocalStorage if available
  try {
    const traceId = getCurrentTraceId();
    if (traceId) {
      data = { ...(data || {}), _traceId: (data && (data as any)._traceId) || traceId };
    }
  } catch (err) {
    // swallow
  }

  // Default options for retries and keeping failed jobs for DLQ inspection
  const defaultOptions: JobsOptions = {
    attempts: 3,
    backoff: {
      type: 'exponential',
      delay: 1000,
    },
    removeOnComplete: true,
    removeOnFail: false, // Keep failed jobs in 'failed' status for Dead Letter Queue handling
    ...options,
  };

  return queue.add(jobName, data, defaultOptions);
}
