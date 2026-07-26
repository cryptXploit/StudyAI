import { ProviderAdapter, ChatMessage, CompletionOptions, CompletionResult } from '../ProviderAdapter';

export class CacheFallbackAdapter implements ProviderAdapter {
  providerName = 'cache-fallback';

  async generateCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    // In a real implementation, you might query Redis or pgvector for a cached semantic match.
    // For graceful degradation, we return a fallback response.
    return {
      content: "I'm currently experiencing high load or connectivity issues. This is a fallback retrieval-only response based on available context. Please try again later for a full AI response.",
      usage: { inputTokens: 0, outputTokens: 0 },
      provider: this.providerName,
      model: 'fallback-cache',
    };
  }
}
