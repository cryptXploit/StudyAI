export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface CompletionOptions {
  temperature?: number;
  maxTokens?: number;
}

export interface CompletionResult {
  content: string;
  usage: {
    inputTokens: number;
    outputTokens: number;
  };
  provider: string;
  model: string;
}

export interface ProviderAdapter {
  providerName: string;
  generateCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<CompletionResult>;

  /**
   * Optional support for text embeddings
   */
  generateEmbedding?(text: string, model: string): Promise<number[]>;
  
  /**
   * Optional streaming support for low-latency responses
   */
  generateStream?(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): AsyncIterable<string>;
}

