import { createClient } from '@supabase/supabase-js';

export enum CircuitState { CLOSED = 'CLOSED', OPEN = 'OPEN', HALF_OPEN = 'HALF_OPEN' }

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class HealthMonitor {
  // Keeping your original circuit breaker logic in memory
  private static states: Record<string, CircuitState> = {};
  private static openedAt: Record<string, number> = {};
  private static readonly CIRCUIT_COOLDOWN_MS = 30_000;
  
  static async getState(identifier: string): Promise<CircuitState> {
    const state = this.states[identifier] || CircuitState.CLOSED;
    if (state === CircuitState.OPEN && Date.now() - (this.openedAt[identifier] || 0) >= this.CIRCUIT_COOLDOWN_MS) {
      this.states[identifier] = CircuitState.HALF_OPEN;
      return CircuitState.HALF_OPEN;
    }
    return state;
  }

  static async recordSuccess(identifier: string, provider: string, latencyMs: number) {
    this.states[identifier] = CircuitState.CLOSED;
    delete this.openedAt[identifier];
    await this.logToDB(provider, 'success', latencyMs);
  }

  static async recordFailure(identifier: string, provider: string, isTimeout: boolean) {
    this.states[identifier] = CircuitState.OPEN;
    this.openedAt[identifier] = Date.now();
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
