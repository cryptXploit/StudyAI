import { NextFunction, Request, Response } from 'express';
import logger from '../core/logger';

const AI_BUSY_MESSAGE = 'Our AI Study Engine is handling high demand right now. Please try again in a few moments.';
const SERVICE_MESSAGE = 'We could not complete this request right now. Please try again shortly.';

const PROVIDER_SIGNATURE = /(google(?:generativeai)?|gemini|groq|deepseek|openai|anthropic|model|embedding|provider|api\s*(?:key|error)|quota|rate.?limit|service unavailable|generativelanguage\.googleapis\.com|fetching from)/i;

type PublicError = {
  error: string;
  message: string;
  code: 'AI_SERVICE_TEMPORARILY_UNAVAILABLE' | 'SERVICE_TEMPORARILY_UNAVAILABLE';
  retryable: true;
};

export function isProviderError(value: unknown): boolean {
  return typeof value === 'string' && PROVIDER_SIGNATURE.test(value);
}

export function publicErrorFor(statusCode: number, rawError?: unknown): PublicError {
  const isAiFailure = isProviderError(rawError);
  const message = isAiFailure ? AI_BUSY_MESSAGE : SERVICE_MESSAGE;

  return {
    error: message,
    message,
    code: isAiFailure ? 'AI_SERVICE_TEMPORARILY_UNAVAILABLE' : 'SERVICE_TEMPORARILY_UNAVAILABLE',
    retryable: true,
  };
}

function rawErrorFromPayload(payload: Record<string, unknown>): string {
  return [payload.error, payload.message, payload.details, payload.failedReason]
    .filter((value): value is string => typeof value === 'string')
    .join(' | ');
}

function sanitizePayload(req: Request, statusCode: number, payload: unknown, force = false): unknown {
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) return payload;

  const responseBody = payload as Record<string, unknown>;
  const rawError = rawErrorFromPayload(responseBody);
  const shouldSanitize = force || statusCode >= 500 || responseBody.state === 'failed' || isProviderError(rawError);
  if (!shouldSanitize) return payload;

  const publicError = publicErrorFor(statusCode, rawError);
  logger.error('api.public_error_sanitized', {
    path: req.path,
    method: req.method,
    statusCode,
    providerError: rawError || 'unclassified internal failure',
    publicCode: publicError.code,
  });

  const sanitized = { ...responseBody, ...publicError } as Record<string, unknown>;
  delete sanitized.details;
  delete sanitized.failedReason;
  delete sanitized.stack;
  return sanitized;
}

function sanitizeSseChunk(req: Request, chunk: unknown): unknown {
  if (typeof chunk !== 'string' || !chunk.includes('data:')) return chunk;

  return chunk.replace(/(data:\s*)([^\n]+)(\n\n)/g, (_match, prefix: string, rawData: string, suffix: string) => {
    try {
      const parsed = JSON.parse(rawData) as Record<string, unknown>;
      if (!Object.prototype.hasOwnProperty.call(parsed, 'error')) return _match;
      return `${prefix}${JSON.stringify(sanitizePayload(req, 503, parsed, true))}${suffix}`;
    } catch {
      return `${prefix}${JSON.stringify(publicErrorFor(503, rawData))}${suffix}`;
    }
  });
}

/**
 * Prevent internal provider, database, and infrastructure messages from reaching
 * public clients. Full details stay in structured backend logs with a trace ID.
 */
export function publicErrorSanitizer(req: Request, res: Response, next: NextFunction) {
  const originalJson = res.json.bind(res);
  const originalSend = res.send.bind(res);
  const originalWrite = res.write.bind(res);
  let jsonPayloadPrepared = false;

  res.json = ((body: unknown) => {
    jsonPayloadPrepared = true;
    try {
      return originalJson(sanitizePayload(req, res.statusCode, body));
    } finally {
      jsonPayloadPrepared = false;
    }
  }) as Response['json'];

  res.send = ((body: unknown) => {
    if (!jsonPayloadPrepared && typeof body === 'string' && (res.statusCode >= 500 || isProviderError(body))) {
      const publicError = publicErrorFor(res.statusCode, body);
      res.type('application/json');
      return originalSend(JSON.stringify(publicError));
    }
    return originalSend(body);
  }) as Response['send'];

  res.write = ((chunk: unknown, ...args: unknown[]) =>
    (originalWrite as any)(sanitizeSseChunk(req, chunk), ...args)) as Response['write'];

  next();
}