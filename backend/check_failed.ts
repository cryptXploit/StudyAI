import { Queue } from 'bullmq';
import { connection } from './src/queue/connection';

async function checkFailed() {
  const queue = new Queue('oracle-extraction', { connection });
  const failedJobs = await queue.getFailed(0, 5);
  for (const job of failedJobs) {
    console.log(`Job ${job.id} Failed Reason:`, job.failedReason);
    console.log(`Stacktrace:`, job.stacktrace);
  }
  process.exit(0);
}
checkFailed();
