/**
 * Worker Registry
 * Exports all BullMQ workers with registration functions
 */

export { ocrWorker, registerOCRWorker } from './ocr.worker';
export {
  dailySummaryWorker,
  registerDailySummaryWorker,
  initializeDailySummaryCron,
  processDailySummaryBatch,
  triggerN8nNotificationWebhook,
} from './daily-summary.worker';

// Document uploads are consumed only by src/queue/worker.ts on the
// document-processing queue. Keeping a single consumer prevents duplicate
// embeddings, conflicting schema writes, and double AI spend.

/**
 * Initialize all workers
 * Call this in your main server startup
 */
export async function initializeAllWorkers() {
  console.log('[WorkerRegistry] Initializing all BullMQ workers...');

  // Import and register workers
  const { registerOCRWorker } = await import('./ocr.worker');
  const { registerDailySummaryWorker, initializeDailySummaryCron } = await import(
    './daily-summary.worker'
  );

  // Register workers
  registerOCRWorker();
  registerDailySummaryWorker();

  // Initialize cron job for daily summaries
  await initializeDailySummaryCron();

  console.log('[WorkerRegistry] All workers initialized successfully');
}
