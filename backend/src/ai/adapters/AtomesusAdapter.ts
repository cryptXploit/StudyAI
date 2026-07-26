import { ProviderAdapter, ChatMessage, CompletionOptions, CompletionResult } from '../ProviderAdapter';

export class AtomesusAdapter implements ProviderAdapter {
  providerName = 'Atomesus';
  private baseUrl = 'https://api.atomesus.com/v1/chat/completions'; // Standard API format

  private getApiKey(): string {
    const key = process.env.ATOMESUS_API_KEY;
    if (!key) throw new Error("Atomesus API key is missing");
    return key;
  }

  async generateCompletion(messages: ChatMessage[], model: string, options?: CompletionOptions): Promise<CompletionResult> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`
      },
      body: JSON.stringify({
        model: model || 'atomesus-latest',
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens
      })
    });

    if (!response.ok) {
      throw new Error(`Atomesus Error: ${await response.text()}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      provider: this.providerName,
      model: model,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0
      }
    };
  }

  async *generateStream(messages: ChatMessage[], model: string, options?: CompletionOptions): AsyncIterable<string> {
    const response = await fetch(this.baseUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${this.getApiKey()}`
      },
      body: JSON.stringify({
        model: model || 'atomesus-latest',
        messages: messages,
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens,
        stream: true
      })
    });

    if (!response.ok) {
      throw new Error(`Atomesus Stream Error: ${await response.text()}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder('utf-8');

    if (!reader) throw new Error("Stream not supported by Atomesus API");

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      
      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');
      
      for (const line of lines) {
        if (line.startsWith('data: ') && line.trim() !== 'data: [DONE]') {
          try {
            const parsed = JSON.parse(line.slice(6));
            const content = parsed.choices[0]?.delta?.content;
            if (content !== undefined && content !== null) {
                // Sometimes custom APIs send spaces as empty strings or specific characters
                yield content; 
                }
          } catch (e) {
            // Ignore partial stream parse errors
          }
        }
      }
    }
  }
}