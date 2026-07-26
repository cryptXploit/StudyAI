import { Job } from 'bullmq';
import * as cron from 'node-cron';
import { createClient } from '@supabase/supabase-js';
import { GoogleGenAI } from '@google/genai';
import { createWorker } from '../queue/worker';
import { addJob, getQueue } from '../queue/producer';
import { connection as redis } from '../queue/connection';
import logger from '../core/logger';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

const ai = new GoogleGenAI({}); // Relies on GEMINI_API_KEY

const N8N_WEBHOOK_URL = process.env.N8N_WEBHOOK_SUMMARY_URL || 'http://localhost:5678/webhook/summary';
const PARALLEL_LIMIT = parseInt(process.env.SUMMARY_PARALLEL_LIMIT || '50', 10);

interface DailySummaryJobData {
  userId: string;
  tenantId: string;
  studyTopics?: string[];
  idempotencyKey: string;
}

interface UserSummary {
  userId: string;
  summary: string;
  generatedAt: string;
}

interface ActiveUser {
  user_id: string;
  tenant_id: string;
}

/**
 * Helper: Fetch active users for the day
 */
async function getActiveUsers(): Promise<ActiveUser[]> {
  const { data: activeSessions, error } = await supabase
    .from('chat_sessions')
    .select('user_id, tenant_id')
    .eq('status', 'active')
    .gte('last_activity_at', new Date(new Date().setHours(0, 0, 0, 0)).toISOString());

  if (error) {
    logger.error('daily_summary.get_active_users', { error: error.message });
    return [];
  }

  return (activeSessions || []) as ActiveUser[];
}

/**
 * Helper: Fetch study topics for a user
 */
async function getUserStudyTopics(userId: string): Promise<string[]> {
  const { data: chunks, error } = await supabase
    .from('file_chunks')
    .select('content')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
    .limit(20);

  if (error) {
    logger.error('daily_summary.get_topics', { userId, error: error.message });
    return [];
  }

  return chunks?.map((c: any) => c.content) || [];
}

/**
 * Helper: Generate summary using Gemini API
 */
async function generateSummaryForUser(userId: string, topics: string[]): Promise<string> {
  if (topics.length === 0) {
    return 'No study activity today.';
  }

  const topicText = topics.join('\n---\n');

  const prompt = `Based on the following study material reviewed today, provide a concise summary (200-300 words) of key learnings and recommendations for tomorrow:

${topicText}

Format as:
- Key Points: (3-4 main takeaways)
- Topics Mastered: (confident areas)
- Areas to Review: (weak areas)
- Tomorrow's Focus: (recommended next steps)`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-1.5-flash',
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    } as any);

    const content = (response as any).candidates?.[0]?.content?.parts?.[0];
    if (content && typeof content === 'object' && 'text' in content) {
      return (content as any).text || 'Unable to generate summary.';
    }

    return 'Unable to generate summary.';
  } catch (error) {
    logger.error('daily_summary.generate', { userId, error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Helper: Save summary to Supabase
 */
async function saveSummaryToSupabase(userId: string, tenantId: string, summary: string): Promise<void> {
  const { error } = await supabase.from('daily_summaries').insert({
    user_id: userId,
    tenant_id: tenantId,
    summary,
    generated_at: new Date().toISOString(),
  });

  if (error) {
    logger.error('daily_summary.save', { userId, error: error.message });
    throw error;
  }
}

/**
 * BullMQ Worker: Process individual user summaries in parallel
 */
export const dailySummaryWorker = createWorker<DailySummaryJobData>(
  'daily-summary',
  async (job: Job<DailySummaryJobData>) => {
    const { userId, tenantId, studyTopics, idempotencyKey } = job.data;

    logger.info('daily_summary.processing', { userId, jobId: job.id });

    try {
      // 1. Get study topics if not provided
      const topics = studyTopics || (await getUserStudyTopics(userId));

      // 2. Generate summary using Gemini
      const summary = await generateSummaryForUser(userId, topics);

      // 3. Save to Supabase
      await saveSummaryToSupabase(userId, tenantId, summary);

      logger.info('daily_summary.completed', { userId, summaryLength: summary.length });

      return {
        success: true,
        userId,
        summaryLength: summary.length,
      };
    } catch (error) {
      logger.error('daily_summary.failed', { userId, error: error instanceof Error ? error.message : String(error) });
      throw error;
    }
  },
  (job) => job.data.idempotencyKey
);

/**
 * Cron Job: Trigger daily summaries at 8 PM (20:00)
 * Fetches all active users and pushes them to the BullMQ queue
 */
export async function initializeDailySummaryCron(): Promise<void> {
  // Schedule: Every day at 8 PM (20:00)
  const cronSchedule = '0 20 * * *'; // 20:00 (8 PM) every day

  cron.schedule(cronSchedule, async () => {
    logger.info('daily_summary.cron_triggered', {});

    try {
      // 1. Get all active users
      const activeUsers = await getActiveUsers();

      if (activeUsers.length === 0) {
        logger.info('daily_summary.no_active_users', {});
        return;
      }

      logger.info('daily_summary.queuing', { activeUsersCount: activeUsers.length });

      // 2. Push jobs to BullMQ queue in batches
      for (const { user_id, tenant_id } of activeUsers) {
        await addJob(
          'daily-summary',
          'generate-summary',
          {
            userId: user_id,
            tenantId: tenant_id,
            idempotencyKey: `summary-${user_id}-${new Date().toISOString().split('T')[0]}`,
          },
          {
            attempts: 3,
            backoff: {
              type: 'exponential',
              delay: 2000,
            },
          }
        );
      }

      logger.info('daily_summary.queued_complete', { jobCount: activeUsers.length });
    } catch (error) {
      logger.error('daily_summary.cron_error', { error: error instanceof Error ? error.message : String(error) });
    }
  });

  logger.info('daily_summary.cron_initialized', {});
}

/**
 * Main processor for batch summary generation with parallel execution
 * Called after all user jobs are queued and picked up by workers
 */
export async function processDailySummaryBatch(userIds: string[]): Promise<{ results: UserSummary[]; failedUsers: string[]; successCount: number; failedCount: number }> {
  logger.info('daily_summary.batch_processing', { userCount: userIds.length });

  const results: UserSummary[] = [];
  const failedUsers: string[] = [];

  // Process in parallel with limit to avoid overwhelming Gemini API
  for (let i = 0; i < userIds.length; i += PARALLEL_LIMIT) {
    const batch = userIds.slice(i, i + PARALLEL_LIMIT);

    logger.info('daily_summary.batch_processing_chunk', { batchSize: batch.length, batchIndex: Math.floor(i / PARALLEL_LIMIT) });

    const batchResults = await Promise.allSettled(
      batch.map(async (userId) => {
        const topics = await getUserStudyTopics(userId);
        const summary = await generateSummaryForUser(userId, topics);

        return {
          userId,
          summary,
          generatedAt: new Date().toISOString(),
        };
      })
    );

    // Collect results
    batchResults.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        results.push(result.value);
      } else {
        logger.error('daily_summary.batch_user_failed', { userId: batch[index], error: String(result.reason) });
        failedUsers.push(batch[index]);
      }
    });
  }

  logger.info('daily_summary.batch_completed', { successCount: results.length, failedCount: failedUsers.length });

  return {
    successCount: results.length,
    failedCount: failedUsers.length,
    failedUsers,
    results,
  };
}

/**
 * Trigger n8n webhook with summary payload for notifications
 */
export async function triggerN8nNotificationWebhook(summaries: UserSummary[]): Promise<boolean> {
  logger.info('daily_summary.n8n_webhook_trigger', { summaryCount: summaries.length });

  const payload = {
    timestamp: new Date().toISOString(),
    summaryCount: summaries.length,
    summaries: summaries.map((s) => ({
      userId: s.userId,
      summaryPreview: s.summary.substring(0, 200),
      generatedAt: s.generatedAt,
    })),
  };

  try {
    const response = await fetch(N8N_WEBHOOK_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      logger.error('daily_summary.n8n_webhook_failed', { status: response.status });
      throw new Error(`n8n webhook returned ${response.status}`);
    }

    logger.info('daily_summary.n8n_webhook_success', {});
    return true;
  } catch (error) {
    logger.error('daily_summary.n8n_webhook_error', { error: error instanceof Error ? error.message : String(error) });
    throw error;
  }
}

/**
 * Register worker with concurrency of 4 for summary generation
 */
export function registerDailySummaryWorker(): void {
  const workerOptions = {
    concurrency: 4,
    maxStalledCount: 2,
    stalledInterval: 30000,
  };

  logger.info('daily_summary.worker_registered', {});
}
