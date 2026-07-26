import { createClient } from '@supabase/supabase-js';

export enum CircuitState { CLOSED = 'CLOSED', OPEN = 'OPEN', HALF_OPEN = 'HALF_OPEN' }

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class HealthMonitor {
  // Keeping your original circuit breaker logic in memory
  private static states: Record<string, CircuitState> = {};
  
  static async getState(providerName: string): Promise<CircuitState> {
    return this.states[providerName] || CircuitState.CLOSED;
  }

  static async recordSuccess(provider: string, latencyMs: number) {
    this.states[provider] = CircuitState.CLOSED;
    await this.logToDB(provider, 'success', latencyMs);
  }

  static async recordFailure(provider: string, isTimeout: boolean) {
    this.states[provider] = CircuitState.OPEN;
    await this.logToDB(provider, isTimeout ? 'timeout' : 'error', 0);
  }

  private static async logToDB(provider: string, status: string, latencyMs: number) {
    try {
      await supabase.from('api_health_logs').insert({ provider, status, latency_ms: latencyMs });
    } catch (error) {
      console.error('[HealthMonitor] Failed to log health', error);
    }
  }
}