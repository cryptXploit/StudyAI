import { connection } from './connection';

export class IdempotencyManager {
  /**
   * Check if a given idempotency key has already been marked as processed.
   */
  static async isProcessed(queueName: string, idempotencyKey: string): Promise<boolean> {
    const val = await connection.get(`idemp:${queueName}:${idempotencyKey}`);
    return val === 'DONE';
  }

  /**
   * Mark an idempotency key as processed.
   * By default, it expires in 7 days to avoid filling up Redis.
   */
  static async markAsProcessed(queueName: string, idempotencyKey: string, ttlSeconds: number = 604800): Promise<void> {
    await connection.set(`idemp:${queueName}:${idempotencyKey}`, 'DONE', 'EX', ttlSeconds);
  }
}
