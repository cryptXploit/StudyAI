import { AsyncLocalStorage } from 'async_hooks';

export interface RequestContextData {
  featureName?: string;
  resolvedTier?: string;
  forcedDowngrade?: boolean;
}

export const requestContext = new AsyncLocalStorage<RequestContextData>();

