const { Queue } = require('bullmq');
const Redis = require('ioredis');

const connection = new Redis(process.env.REDIS_URL || 'redis://127.0.0.1:6379', {
  maxRetriesPerRequest: null,
});

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
