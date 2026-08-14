import { ProviderAdapter, ChatMessage, CompletionOptions, CompletionResult } from '../ProviderAdapter';

export class GroqAdapter implements ProviderAdapter {
  providerName = 'groq';

  async generateCompletion(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): Promise<CompletionResult> {
    const apiKey = options?.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API Key missing');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || process.env.DEFAULT_GROQ_GENERAL_MODEL || 'openai/gpt-oss-20b',
        messages,
        temperature: options?.temperature || 0.7,
        // 🟢 FIX: max_tokens রিমুভ করা হয়েছে। 
        // RAG এর ক্ষেত্রে PDF টেক্সট অনেক বড় হয়, তাই Groq-কে তার লিমিট নিজে ক্যালকুলেট করতে দেওয়া হলো।
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = response.statusText;
      try {
        errMsg = JSON.parse(errBody).error?.message || errBody;
      } catch (e) { errMsg = errBody; }
      throw new Error(`Groq API Error: ${errMsg}`);
    }

    const data = await response.json();
    
    return {
      content: data.choices[0].message.content,
      provider: this.providerName,
      model: model,
      usage: {
        inputTokens: data.usage?.prompt_tokens || 0,
        outputTokens: data.usage?.completion_tokens || 0,
      }
    };
  }

  async *generateStream(
    messages: ChatMessage[],
    model: string,
    options?: CompletionOptions
  ): AsyncIterable<string> {
    const apiKey = options?.apiKey || process.env.GROQ_API_KEY;
    if (!apiKey) throw new Error('Groq API Key missing');

    const response = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: model || process.env.DEFAULT_GROQ_GENERAL_MODEL || 'openai/gpt-oss-20b',
        messages,
        temperature: options?.temperature || 0.7,
        stream: true,
        // 🟢 FIX: এখানেও max_tokens রিমুভ করা হয়েছে।
      }),
    });

    if (!response.ok) {
      const errBody = await response.text();
      let errMsg = response.statusText;
      try {
        errMsg = JSON.parse(errBody).error?.message || errBody;
      } catch (e) { errMsg = errBody; }
      throw new Error(`Groq API Error: ${errMsg}`);
    }

    const reader = response.body?.getReader();
    if (!reader) throw new Error('Failed to get stream reader');

    const decoder = new TextDecoder();
    let buffer = '';
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      // A provider SSE event can be split across arbitrary network chunks.
      // Preserve the unfinished last line so JSON is never silently dropped.
      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split(/\r?\n/);
      buffer = lines.pop() || '';
      
      for (const line of lines) {
        if (line.startsWith('data: ') && !line.includes('[DONE]')) {
          try {
            const data = JSON.parse(line.slice(6));
            if (data.choices && data.choices[0]?.delta?.content) {
              yield data.choices[0].delta.content;
            }
          } catch (e) {
            // Ignore parse errors on partial chunks
          }
        }
      }
    }

    // Flush the decoder and process a final event if the provider closed
    // without a trailing newline.
    buffer += decoder.decode();
    if (buffer.startsWith('data: ') && !buffer.includes('[DONE]')) {
      try {
        const data = JSON.parse(buffer.slice(6));
        if (data.choices?.[0]?.delta?.content) yield data.choices[0].delta.content;
      } catch {
        // A malformed final SSE event is ignored; prior valid tokens remain usable.
      }
    }
  }
}
