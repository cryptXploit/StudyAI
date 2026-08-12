import { Redis } from 'ioredis';
import { v4 as uuidv4 } from 'uuid';

export class QuotaGovernor {
  private redis: Redis;
  private readonly WINDOW_SECONDS = 60;
  
  constructor() {
    this.redis = new Redis(process.env.REDIS_URL || 'redis://localhost:6379');
  }

  /**
   * Acquire a slot for a provider task.
   * Uses Redis to rate-limit and protect providers (e.g. Gemini 429s).
   */
  async acquireToken(providerName: string, maxTokensPerMinute: number = 100): Promise<boolean> {
    const key = `quota:limit:${providerName}`;
    const now = Date.now();
    const windowStart = now - (this.WINDOW_SECONDS * 1000);
    const memberId = `${now}-${uuidv4()}`;
    
    const script = `
      redis.call('ZREMRANGEBYSCORE', KEYS[1], 0, ARGV[1])
      local currentCount = redis.call('ZCARD', KEYS[1])
      if currentCount >= tonumber(ARGV[3]) then
        return 0
      else
        redis.call('ZADD', KEYS[1], ARGV[2], ARGV[4])
        redis.call('EXPIRE', KEYS[1], tonumber(ARGV[5]))
        return 1
      end
    `;

    const result = await this.redis.eval(
      script,
      1,
      key,
      windowStart.toString(),
      now.toString(),
      maxTokensPerMinute.toString(),
      memberId,
      this.WINDOW_SECONDS.toString()
    );
    
    return result === 1;
  }

  /**
   * Called when a provider returns a 429 Error.
   * Implements a global cooldown for the provider.
   */
  async recordProvider429(providerName: string, cooldownSeconds: number = 30): Promise<void> {
    const key = `quota:cooldown:${providerName}`;
    await this.redis.set(key, '429', 'EX', cooldownSeconds);
  }

  /**
   * Check if a provider is currently in cooldown from a 429 error.
   */
  async isInCooldown(providerName: string): Promise<boolean> {
    const key = `quota:cooldown:${providerName}`;
    const status = await this.redis.get(key);
    return status === '429';
  }

  /**
   * Run a task with quota protection.
   * If a 429 occurs, it records a cooldown and re-throws a standard error for BullMQ delay/retry.
   */
  async runWithQuotaProtection<T>(
    providerName: string, 
    taskFn: () => Promise<T>, 
    maxTokensPerMinute: number = 100
  ): Promise<T> {
    if (await this.isInCooldown(providerName)) {
      throw new Error(`PROVIDER_COOLDOWN:${providerName}`);
    }

    const acquired = await this.acquireToken(providerName, maxTokensPerMinute);
    if (!acquired) {
      throw new Error(`QUOTA_EXHAUSTED:${providerName}`);
    }

    try {
      return await taskFn();
    } catch (error: any) {
      const is429 = error.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests');
      if (is429) {
        await this.recordProvider429(providerName, 30); // 30s cooldown across all workers
        throw new Error(`PROVIDER_429_COOLDOWN:${providerName}`);
      }
      throw error;
    }
  }
}

export const quotaGovernor = new QuotaGovernor();
