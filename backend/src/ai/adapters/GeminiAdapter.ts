import { ProviderAdapter, ChatMessage, CompletionOptions, CompletionResult } from '../ProviderAdapter';

export class GeminiAdapter implements ProviderAdapter {
  providerName = 'gemini';

  private getApiKey(): string {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || '';
  }

  // 🟢 FIX: Gemini Format Converter (Converts 'system' to system_instruction)
  private formatMessages(messages: ChatMessage[]) {
    let systemInstruction = '';
    const geminiContents: any[] = [];

    for (const msg of messages) {
      if (msg.role === 'system') {
        systemInstruction += msg.content + '\n';
      } else {
        geminiContents.push({
          role: msg.role === 'assistant' ? 'model' : 'user',
          parts: [{ text: msg.content }]
        });
      }
    }

    return { systemInstruction: systemInstruction.trim(), geminiContents };
  }

  // 🟢 FIX: Advanced Auto-correct for Google's strict model naming
  private getSafeModelName(model: string): string {
    const lower = model.toLowerCase();
    
    // Explicit 2.0 Mappings
    if (lower.includes('flash-2.0') || lower.includes('2.0-flash')) return process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-3.5-flash';
    if (lower.includes('pro-2.0') || lower.includes('2.0-pro')) return process.env.DEFAULT_GEMINI_COMPLEX_MODEL || 'gemini-3.1-pro-preview';
    
    // Explicit 1.5 Mappings (Auto-upgrade to 3.5 since 1.5 is deprecated)
    if (lower.includes('1.5-flash')) return process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-3.5-flash';
    if (lower.includes('1.5-pro')) return process.env.DEFAULT_GEMINI_COMPLEX_MODEL || 'gemini-3.1-pro-preview';
    
    let resultModel = process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-3.5-flash';

    // Generic Fallbacks
    if (lower === 'gemini' || lower === 'flash') {
        resultModel = process.env.DEFAULT_GEMINI_GENERAL_MODEL || 'gemini-3.5-flash';
    } else if (lower === 'pro') {
        resultModel = process.env.DEFAULT_GEMINI_COMPLEX_MODEL || 'gemini-3.1-pro-preview';
    } else if (lower.startsWith('gemini-')) {
        resultModel = model;
    }

    // Absolute Safety Net: If the PM2 environment variable or the result model is the deprecated 1.5, FORCE 3.5
    if (resultModel.includes('1.5-flash')) resultModel = 'gemini-3.5-flash';
    if (resultModel.includes('1.5-pro')) resultModel = 'gemini-3.1-pro-preview';

    return resultModel;
  }

  async generateCompletion(messages: ChatMessage[], model: string, options?: CompletionOptions): Promise<CompletionResult> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Gemini API Key is missing. Please configure it in the Admin Settings.');

    const safeModel = this.getSafeModelName(model);
    const { systemInstruction, geminiContents } = this.formatMessages(messages);

    const requestBody: any = {
      contents: geminiContents,
      generationConfig: {
        temperature: options?.temperature || 0.7,
      }
    };

    if (systemInstruction) {
      requestBody.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:generateContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini API Error: ${errText}`);
    }

    const data = await response.json();
    const text = data.candidates?.[0]?.content?.parts?.[0]?.text || '';

    return {
      content: text,
      provider: this.providerName,
      model: safeModel,
      usage: {
        inputTokens: data.usageMetadata?.promptTokenCount || 0,
        outputTokens: data.usageMetadata?.candidatesTokenCount || 0,
      }
    };
  }

  async *generateStream(messages: ChatMessage[], model: string, options?: CompletionOptions): AsyncIterable<string> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Gemini API Key is missing. Please configure it in the Admin Settings.');

    const safeModel = this.getSafeModelName(model);
    const { systemInstruction, geminiContents } = this.formatMessages(messages);

    const requestBody: any = {
      contents: geminiContents,
      generationConfig: {
        temperature: options?.temperature || 0.7,
      }
    };

    if (systemInstruction) {
      requestBody.system_instruction = { parts: [{ text: systemInstruction }] };
    }

    // 🟢 Streaming with Server-Sent Events (SSE) directly from Google
    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${safeModel}:streamGenerateContent?alt=sse&key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(requestBody)
    });

    if (!response.ok) {
      const errText = await response.text();
      let errMsg = 'Unknown error';
      try { errMsg = JSON.parse(errText).error.message; } catch(e) { errMsg = errText; }
      throw new Error(`Gemini API Error: ${errMsg}`);
    }

    if (!response.body) throw new Error('No stream body returned from Gemini.');

    const reader = response.body.getReader();
    const decoder = new TextDecoder();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value, { stream: true });
      const lines = chunk.split('\n');

      for (const line of lines) {
        if (line.startsWith('data: ')) {
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;

          try {
            const data = JSON.parse(dataStr);
            const textChunk = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (textChunk) {
              yield textChunk;
            }
          } catch (e) {
            // Ignore partial parsing errors
          }
        }
      }
    }
  }

  async generateEmbedding(text: string, model: string): Promise<number[]> {
    const apiKey = this.getApiKey();
    if (!apiKey) throw new Error('Gemini API Key is missing.');

    // Fallback to text-embedding-004 if model is not properly passed
    const actualModel = model ? model : 'text-embedding-004';

    const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${actualModel}:embedContent?key=${apiKey}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        model: `models/${actualModel}`,
        content: { parts: [{ text }] }
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Gemini Embedding Error: ${errText}`);
    }

    const data = await response.json();
    return data.embedding?.values || [];
  }
}
