import { createClient } from '@supabase/supabase-js';
import { connection as redis } from '../queue/connection';
import { ChatMessage } from '../ai/ProviderAdapter';

const supabaseUrl = process.env.SUPABASE_URL || 'https://mock.supabase.co';
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY || 'mock-key';
const supabase = createClient(supabaseUrl, supabaseKey);

/**
 * Represents a single conversation turn
 */
export interface ConversationTurn {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
  tokens?: number;
}

/**
 * Represents a long-term memory fact
 */
export interface MemoryFact {
  id: string;
  userId: string;
  content: string;
  category?: string;
  importance: number; // 1-10
  created_at: string;
}

/**
 * Memory Service - Manages short-term and long-term conversation memory
 */
export class MemoryService {
  private static readonly SHORT_TERM_KEY = 'conversation:turns';
  private static readonly SHORT_TERM_TTL = 86400; // 24 hours
  private static readonly MAX_SHORT_TERM_TURNS = 5;

  /**
   * Store a conversation turn in short-term memory (Redis)
   */
// প্যারামিটারে sessionId (বা fileId) যুক্ত করা হলো
  static async storeShortTermMemory(
    userId: string,
    sessionId: string, // <-- NEW
    turn: ConversationTurn
  ): Promise<void> {
    // Key-তে sessionId যুক্ত করা হলো যাতে চ্যাটগুলো আলাদা থাকে
    const key = `${this.SHORT_TERM_KEY}:${userId}:${sessionId}`; 
    
    const serialized = JSON.stringify(turn);
    await redis.rpush(key, serialized);
    await redis.ltrim(key, -this.MAX_SHORT_TERM_TURNS, -1);
    await redis.expire(key, this.SHORT_TERM_TTL);
  }

  static async fetchShortTermMemory(
    userId: string,
    sessionId: string, // <-- NEW
    limit: number = this.MAX_SHORT_TERM_TURNS
  ): Promise<ConversationTurn[]> {
    const key = `${this.SHORT_TERM_KEY}:${userId}:${sessionId}`;
    const turns = await redis.lrange(key, -limit, -1);
    
    if (!turns || turns.length === 0) {
      console.log(`[MemoryService] No short-term memory found for user ${userId}`);
      return [];
    }

    const parsed: ConversationTurn[] = turns.map(turn => {
      try {
        return JSON.parse(turn);
      } catch (e) {
        console.error(`[MemoryService] Failed to parse turn: ${turn}`);
        return null;
      }
    }).filter((turn): turn is ConversationTurn => turn !== null);

    console.log(`[MemoryService] Retrieved ${parsed.length} short-term turns for user ${userId}`);
    return parsed;
  }

  /**
   * Clear short-term memory for a user
   */
  static async clearShortTermMemory(userId: string, sessionId: string): Promise<void> {
    const key = `${this.SHORT_TERM_KEY}:${userId}:${sessionId}`;
    await redis.del(key);
    console.log(`[MemoryService] Cleared short-term memory for user ${userId}`);
  }

  /**
   * Fetch long-term memory facts from Supabase
   */
  static async fetchLongTermMemory(
    userId: string,
    limit: number = 10
  ): Promise<MemoryFact[]> {
    const { data: facts, error } = await supabase
      .from('user_memory_facts')
      .select('*')
      .eq('user_id', userId)
      .order('importance', { ascending: false })
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('[MemoryService] Error fetching long-term memory:', error);
      return [];
    }

    console.log(`[MemoryService] Retrieved ${facts?.length || 0} long-term facts for user ${userId}`);
    return (facts || []) as MemoryFact[];
  }

  /**
   * Store a fact in long-term memory (Supabase)
   */
  static async storeLongTermMemory(
    userId: string,
    fact: string,
    category?: string,
    importance: number = 5
  ): Promise<MemoryFact | null> {
    const { data, error } = await supabase
      .from('user_memory_facts')
      .insert({
        user_id: userId,
        content: fact,
        category: category || 'general',
        importance: Math.max(1, Math.min(10, importance)), // Clamp 1-10
      })
      .select()
      .single();

    if (error) {
      console.error('[MemoryService] Error storing long-term memory:', error);
      return null;
    }

    console.log(`[MemoryService] Stored long-term fact for user ${userId}`);
    return data as MemoryFact;
  }

  /**
   * Convert short-term and long-term memory to conversation history
   * Format: [{ role: 'user'|'assistant', content: string }, ...]
   */
  static async buildMemoryContext(userId: string, sessionId: string): Promise<ChatMessage[]> {
    // Fetch both short-term and long-term memory
    const shortTermTurns = await this.fetchShortTermMemory(userId, sessionId);
    const longTermFacts = await this.fetchLongTermMemory(userId, 5);

    const messages: ChatMessage[] = [];

    // Add long-term memory as system context
    if (longTermFacts.length > 0) {
      const factsText = longTermFacts
        .map(f => `- ${f.content} (${f.category || 'general'})`)
        .join('\n');

      messages.push({
        role: 'system',
        content: `You have the following background knowledge about the user:\n${factsText}`,
      });
    }

    // Add short-term conversation history
    for (const turn of shortTermTurns) {
      messages.push({
        role: turn.role,
        content: turn.content,
      });
    }

    return messages;
  }

  /**
   * Format memory into native SDK format (Gemini/DeepSeek compatible)
   * Returns: [{ role, content }, ...]
   */
  static formatForNativeSDK(messages: ChatMessage[]): Array<{ role: string; content: string }> {
    return messages.map(msg => ({
      role: msg.role === 'system' ? 'user' : msg.role, // Some SDKs don't support system role in history
      content: msg.content,
    }));
  }

  /**
   * Extract memory facts from a user's question
   * Useful for automatically capturing key information
   */
  static async extractAndStoreMemoryFacts(
    userId: string,
    userQuery: string,
    aiResponse: string
  ): Promise<void> {
    // In production, you'd use NLP or an LLM to extract facts
    // For now, we'll skip automatic extraction (user would manually set facts)
    console.log(`[MemoryService] Fact extraction would occur for: "${userQuery}"`);
  }

  /**
   * Get memory summary for context
   */
  static async getMemorySummary(userId: string, sessionId: string): Promise<{
    shortTermCount: number;
    longTermCount: number;
    lastInteraction?: string;
  }> {
    const shortTermTurns = await this.fetchShortTermMemory(userId, sessionId);
    const longTermFacts = await this.fetchLongTermMemory(userId);

    const lastTurn = shortTermTurns[shortTermTurns.length - 1];

    return {
      shortTermCount: shortTermTurns.length,
      longTermCount: longTermFacts.length,
      lastInteraction: lastTurn ? new Date(lastTurn.timestamp).toISOString() : undefined,
    };
  }
}
