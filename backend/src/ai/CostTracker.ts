import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.SUPABASE_URL || '',
  process.env.SUPABASE_SERVICE_ROLE_KEY || ''
);

export class CostTracker {
  static async logUsage(
    userId: string,
    tier: string,
    provider: string,
    model: string,
    inputTokens: number,
    outputTokens: number
  ) {
    try {
      await supabase.from('api_cost_logs').insert({
        user_id: userId,
        tier,
        provider,
        model,
        input_tokens: inputTokens,
        output_tokens: outputTokens
      });
    } catch (error) {
      console.error('[CostTracker] Failed to log usage to DB', error);
    }
  }
}