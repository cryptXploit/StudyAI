import OpenAI from 'openai';
import { ProviderAdapter, ChatMessage, CompletionOptions, CompletionResult } from '../ProviderAdapter';

export class DeepSeekAdapter implements ProviderAdapter {
  providerName = 'deepseek';
  private client: OpenAI;

  constructor() {
    this.client = new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey: process.env.DEEPSEEK_API_KEY,
    });
  }

  async generateCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await this.client.chat.completions.create({
      model,
      messages: messages as any[], // openai types match role: 'user'|'assistant'|'system'
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
    });

    return {
      content: response.choices[0]?.message?.content || '',
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
      provider: this.providerName,
      model,
    };
  }
}
