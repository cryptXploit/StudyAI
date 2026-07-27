'use client';

import { useEffect } from 'react';
import { showPublicError } from '@/lib/errors/publicError';

type ErrorPayload = { code?: unknown; retryable?: unknown };

function isCentralPublicError(payload: ErrorPayload | null): boolean {
  return payload?.code === 'AI_SERVICE_TEMPORARILY_UNAVAILABLE'
    || payload?.code === 'SERVICE_TEMPORARILY_UNAVAILABLE';
}

/**
 * One response observer for every backend feature request. It only reacts to
 * server-issued public error codes, never to provider text or Supabase traffic.
 */
export function PublicErrorProvider() {
  useEffect(() => {
    const nativeFetch = window.fetch.bind(window);

    window.fetch = async (...args: Parameters<typeof fetch>) => {
      try {
        const response = await nativeFetch(...args);
        const contentType = response.headers.get('content-type') || '';

        if (contentType.includes('application/json')) {
          void response.clone().json()
            .then((payload: ErrorPayload) => {
              if (isCentralPublicError(payload)) {
                showPublicError(payload);
              }
            })
            .catch(() => undefined);
        }

        return response;
      } catch (error) {
        // Do not reveal browser/network implementation details to users.
        showPublicError();
        throw error;
      }
    };

    return () => {
      window.fetch = nativeFetch;
    };
  }, []);

  return null;
}