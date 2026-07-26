import { useCallback, useRef, useEffect } from 'react';

export type ChatMode = 'summary' | 'quiz' | 'deep-dive' | 'default';

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  cacheHit?: boolean;
  mode?: ChatMode;
}

interface UseSSEChatOptions {
  endpoint?: string;
  onMessageStream?: (chunk: string) => void;
  onComplete?: () => void;
  onError?: (error: Error) => void;
}

export function useSSEChat(options: UseSSEChatOptions = {}) {
  const {
    endpoint = process.env.NEXT_PUBLIC_API_URL,
    onMessageStream,
    onComplete,
    onError,
  } = options;

  const abortControllerRef = useRef<AbortController | null>(null);

  /**
   * Send a message and stream the response via fetch SSE
   */
  const sendMessage = useCallback(
    async (
      message: string,
      fileId?: string,
      mode: ChatMode = 'default',
      userId?: string,
      tenantId?: string,
      accessToken?: string // SSR বাগ ফিক্স করার জন্য টোকেন প্যারামিটার অ্যাড করা হলো
    ): Promise<{ fullResponse: string; cacheHit: boolean }> => {
      return new Promise((resolve, reject) => {
        try {
          abortControllerRef.current = new AbortController();
          let fullResponse = '';
          let cacheHit = false;

          // Construct request payload
          const payload = {
            query: message,
            file_id: fileId,
            mode,
            user_id: userId,
            tenant_id: tenantId,
          };

          const body = JSON.stringify(payload);
          
          // Token Management
          const headers: Record<string, string> = {
            'Content-Type': 'application/json',
          };
          const token = accessToken || (typeof window !== 'undefined' ? localStorage.getItem('access_token') : '');
          if (token) {
            headers['Authorization'] = `Bearer ${token}`;
          }

          // Fetch with streaming
          fetch(endpoint, {
            method: 'POST',
            headers,
            body,
            signal: abortControllerRef.current.signal,
          })
            .then(async (response) => {
              if (!response.ok) {
                throw new Error(
                  `HTTP ${response.status}: ${response.statusText}`
                );
              }

              // Check for cache hit header
              const cacheHitHeader =
                response.headers.get('x-cache-hit') === 'true';
              cacheHit = cacheHitHeader;

              // Get reader from response body
              const reader = response.body?.getReader();
              if (!reader) {
                throw new Error('No response body reader');
              }

              const decoder = new TextDecoder();

              // Read stream chunks
              while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const chunk = decoder.decode(value, { stream: true });
                
                // Parse SSE format: data: <content>
                const lines = chunk.split('\n');
                for (const line of lines) {
                  if (line.startsWith('data: ')) {
                    const data = line.slice(6);
                    if (data === '[DONE]') continue;
                    if (data.trim()) {
                      
                      // JSON Text chunking parsing fix
                      let textChunk = data;
                      try {
                        const parsed = JSON.parse(data);
                        if (parsed.text) textChunk = parsed.text;
                        else if (parsed.content) textChunk = parsed.content;
                      } catch (e) {
                        textChunk = textChunk.replace(/\\n/g, '\n');
                      }

                      fullResponse += textChunk;
                      onMessageStream?.(textChunk);
                    }
                  }
                }
              }

              onComplete?.();
              resolve({ fullResponse, cacheHit });
            })
            .catch((error) => {
              if (error.name !== 'AbortError') {
                onError?.(error);
                reject(error);
              }
            });
        } catch (error) {
          const err = error instanceof Error ? error : new Error(String(error));
          onError?.(err);
          reject(err);
        }
      });
    },
    [endpoint, onMessageStream, onComplete, onError]
  );

  /**
   * Cancel ongoing streaming request
   */
  const cancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  /**
   * Cleanup on unmount
   */
  useEffect(() => {
    return () => {
      cancel();
    };
  }, [cancel]);

  return {
    sendMessage,
    cancel,
  };
}
