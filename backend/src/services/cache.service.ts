import Redis, { RedisOptions } from 'ioredis';
import crypto from 'crypto';

class CacheService {
  private redis: Redis | null = null;
  private isConnected: boolean = false;

  constructor() {
    this.initializeRedis();
  }

  private initializeRedis() {
    try {
      const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
      
      const redisOptions: RedisOptions = {
        // Fail fast if disconnected so we can gracefully degrade instead of hanging
        enableOfflineQueue: false,
        maxRetriesPerRequest: 1,
        retryStrategy(times) {
          // Stop retrying after 3 attempts
          if (times > 3) {
            console.warn('Redis connection failed after 3 retries. Bypassing cache.');
            return null;
          }
          return Math.min(times * 100, 2000);
        },
      };

      this.redis = new Redis(redisUrl, redisOptions);

      this.redis.on('connect', () => {
        console.log('Redis connected successfully.');
        this.isConnected = true;
      });

      this.redis.on('error', (err) => {
        console.warn(`Redis connection error: ${err.message}. Cache operations will be bypassed.`);
        this.isConnected = false;
      });

      this.redis.on('end', () => {
        this.isConnected = false;
      });

    } catch (error) {
      console.error('Failed to initialize Redis:', error);
      this.isConnected = false;
    }
  }

/**
   * Helper to generate a consistent SHA-256 hash for exact matches
   * UPDATED: Now includes fileId to prevent cross-file cache pollution
   */
  private generateHash(userId: string, query: string, fileId?: string): string {
    const payload = fileId ? `${userId}:${fileId}:${query}` : `${userId}:global:${query}`;
    return crypto.createHash('sha256').update(payload).digest('hex');
  }

  // ==========================================
  // 1. Exact Cache (O(1) lookup based on hashed user+file+query)
  // ==========================================
  
  public async getExact(userId: string, query: string, fileId?: string): Promise<string | null> {
    if (!this.isConnected || !this.redis) return null;
    try {
      const hash = this.generateHash(userId, query, fileId);
      return await this.redis.get(`exact:${hash}`);
    } catch (error) {
      console.warn('Redis getExact error, bypassing cache:', error);
      return null;
    }
  }

  public async setExact(userId: string, query: string, data: string, fileId?: string, ttlSeconds: number = 3600): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    try {
      const hash = this.generateHash(userId, query, fileId);
      await this.redis.set(`exact:${hash}`, data, 'EX', ttlSeconds);
    } catch (error) {
      console.warn('Redis setExact error, skipping cache write:', error);
    }
  }

  // ==========================================
  // 2. Semantic Cache (placeholder for vector similarity)
  // ==========================================
  
  public async getSemantic(query: string, embedding?: number[]): Promise<string | null> {
    if (!this.isConnected || !this.redis) return null;
    try {
      // TODO: Implement actual vector search (e.g., using Redis Stack/RediSearch, pgvector, or Pinecone)
      // This is a placeholder returning null to simulate a cache miss.
      console.debug(`[Semantic Cache] Lookup placeholder for query: ${query}`);
      return null;
    } catch (error) {
      console.warn('Redis getSemantic error, bypassing cache:', error);
      return null;
    }
  }

  public async setSemantic(query: string, data: string, embedding?: number[]): Promise<void> {
    if (!this.isConnected || !this.redis) return;
    try {
      // TODO: Implement actual vector storage
      console.debug(`[Semantic Cache] Set placeholder for query: ${query}`);
    } catch (error) {
      console.warn('Redis setSemantic error, skipping cache write:', error);
    }
  }

  // ==========================================
  // 3. TTL Cache for Rate Limits
  // ==========================================
  
  public async incrementRateLimit(key: string, ttlSeconds: number): Promise<number> {
    // If Redis is down, we fail open and return 1 (allowing the request) to prevent the app from breaking.
    if (!this.isConnected || !this.redis) return 1; 
    try {
      const rateKey = `ratelimit:${key}`;
      const current = await this.redis.incr(rateKey);
      if (current === 1) {
        // Set TTL only on the first increment
        await this.redis.expire(rateKey, ttlSeconds);
      }
      return current;
    } catch (error) {
      console.warn('Redis incrementRateLimit error, bypassing rate limit:', error);
      return 1; // Graceful degradation (allow request)
    }
  }
}

export const cacheService = new CacheService();
