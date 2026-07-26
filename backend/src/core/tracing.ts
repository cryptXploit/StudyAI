import { AsyncLocalStorage } from 'async_hooks';
import { v4 as uuidv4 } from 'uuid';
import { Request, Response, NextFunction } from 'express';

type Store = { traceId: string } | undefined;

const asyncLocalStorage = new AsyncLocalStorage<Store>();

export function traceMiddleware(req: Request, res: Response, next: NextFunction) {
  const header = (req.headers['x-trace-id'] as string) || (req.headers['x-request-id'] as string);
  const traceId = header || uuidv4();
  res.setHeader('X-Trace-Id', traceId);

  // Run the rest of the request handling within the trace context
  asyncLocalStorage.run({ traceId }, () => {
    next();
  });
}

export function getCurrentTraceId(): string | undefined {
  return asyncLocalStorage.getStore()?.traceId;
}

export function runWithTraceId<T>(traceId: string | undefined, fn: () => Promise<T> | T): Promise<T> {
  if (!traceId) {
    // If no trace ID, just run the function normally
    const result = fn();
    return Promise.resolve(result);
  }
  // Run with trace context
  return asyncLocalStorage.run({ traceId }, fn) as unknown as Promise<T>;
}

export { asyncLocalStorage };
