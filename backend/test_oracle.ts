import { oracleWorker } from './src/queue/oracleWorker';
import { Job } from 'bullmq';

async function testWorker() {
  console.log("Starting mock job...");
  const mockJob = {
    data: {
      filesData: [{
        mimetype: 'image/png',
        bufferBase64: Buffer.from('fake image').toString('base64')
      }],
      userId: 'test-user',
      userTier: 'Free',
      language: 'English'
    },
    id: 'test-123'
  } as Job;

  try {
    // @ts-ignore
    await oracleWorker.processJob(mockJob, mockJob.data.token);
    console.log("Job Success");
  } catch (err: any) {
    console.error("Job Failed with error:", err.stack);
  }
  process.exit(0);
}

testWorker();
