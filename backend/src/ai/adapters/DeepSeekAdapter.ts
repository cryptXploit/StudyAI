import OpenAI from 'openai';
import { ProviderAdapter, ChatMessage, CompletionOptions, CompletionResult } from '../ProviderAdapter';

export class DeepSeekAdapter implements ProviderAdapter {
  providerName = 'deepseek';

  private getClient(): OpenAI {
    const apiKey = process.env.DEEPSEEK_API_KEY;
    if (!apiKey) {
      throw new Error('DeepSeek API key is not configured for the selected route.');
    }

    return new OpenAI({
      baseURL: 'https://api.deepseek.com/v1',
      apiKey,
    });
  }

  async generateCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const response = await this.getClient().chat.completions.create({
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

  async *generateStream(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): AsyncIterable<string> {
    const stream = await this.getClient().chat.completions.create({
      model,
      messages: messages as any[],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens,
      stream: true,
    });

    for await (const chunk of stream) {
      const content = chunk.choices[0]?.delta?.content;
      if (content) yield content;
    }
  }
}
