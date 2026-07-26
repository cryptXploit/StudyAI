import Redis from 'ioredis';
import { Queue } from 'bullmq';

// Reuse connection across BullMQ instances as per best practices
export const connection = new Redis({
  host: process.env.REDIS_HOST || '127.0.0.1',
  port: parseInt(process.env.REDIS_PORT || '6379', 10),
  password: process.env.REDIS_PASSWORD || undefined,
  maxRetriesPerRequest: null, // Required by BullMQ
});

// ==========================================
// 🟢 Create the Queue for Document Processing
// ==========================================
export const documentQueue = new Queue('document-processing', { 
  connection: connection as any, // 🟢 FIX: TypeScript-এর ভার্সন কনফ্লিক্ট বাইপাস করার জন্য 'as any'
  defaultJobOptions: {
    attempts: 3, 
    backoff: { type: 'exponential', delay: 2000 }, 
  }
});

// ==========================================
// 🟢 Create the Queue for Oracle Background Extraction
// ==========================================
export const oracleQueue = new Queue('oracle-extraction', { 
  connection: connection as any,
  defaultJobOptions: {
    attempts: 3, // Auto retry if API quota fails
    backoff: { type: 'exponential', delay: 30000 }, // Wait 30s before retrying for rate limits
    removeOnComplete: { age: 3600, count: 1000 }, // Keep completed jobs for 1 hour so frontend can poll the result
    removeOnFail: { age: 24 * 3600 },
  }
});