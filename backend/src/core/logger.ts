import { createLogger, format, transports } from 'winston';
import util from 'util';
import { getCurrentTraceId } from './tracing';

const { combine, timestamp, json } = format;

const SENSITIVE_KEYS = [
  /password/i,
  /passwd/i,
  /token/i,
  /access[_-]?token/i,
  /refresh[_-]?token/i,
  /secret/i,
  /session[_-]?secret/i,
  /authorization/i,
  /authorization[_-]?token/i,
  /api[_-]?key/i,
  /apikey/i,
  /credential/i,
  /private[_-]?key/i
];

function maskValue(value: any): string {
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'string') {
    if (value.length > 8) return `${value.slice(0, 4)}...${value.slice(-4)}`;
    return '****';
  }
  if (typeof value === 'number' || typeof value === 'boolean') return String(value);
  return '****';
}

function sanitizeObject(obj: any): any {
  if (obj === null || obj === undefined) return obj;

  if (typeof obj === 'string') return obj;
  if (typeof obj !== 'object') return obj;

  if (Array.isArray(obj)) return obj.map(sanitizeObject);

  const out: any = {};
  for (const key of Object.keys(obj)) {
    const val = obj[key];
    if (SENSITIVE_KEYS.some((r) => r.test(key))) {
      out[key] = maskValue(val);
    } else {
      out[key] = sanitizeObject(val);
    }
  }
  return out;
}

const sanitizeFormat = format((info: any) => {
  // Sanitize message if it's an object
  if (info.message && typeof info.message === 'object') {
    info.message = sanitizeObject(info.message);
  }

  // Sanitize meta properties
  for (const k of Object.keys(info)) {
    if (k === 'level' || k === 'message' || k === 'timestamp' || k === 'traceId') continue;
    try {
      info[k] = sanitizeObject(info[k]);
    } catch (err) {
      // swallow
    }
  }

  return info;
});

const addTraceIdFormat = format((info: any) => {
  try {
    const traceId = getCurrentTraceId();
    if (traceId) {
      info.traceId = traceId;
    }
  } catch (err) {
    // swallow - traceId not available in this context
  }
  return info;
});

const logger = createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: combine(
    timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    addTraceIdFormat(),
    sanitizeFormat(),
    json()
  ),
  transports: [new transports.Console({ stderrLevels: ['error'] })],
  exitOnError: false,
});

// Map console methods to structured logger to ensure all logs go through winston
const consoleMethods: Record<string, string> = {
  log: 'info',
  info: 'info',
  warn: 'warn',
  error: 'error',
  debug: 'debug',
};

for (const [consoleMethod, level] of Object.entries(consoleMethods)) {
  const originalMethod = (console as any)[consoleMethod] as unknown;
  (console as any)[consoleMethod] = (...args: any[]) => {
    try {
      const msg = args.map((a) => (typeof a === 'string' ? a : util.inspect(a, { depth: 3 }))).join(' ');
      logger.log({ level, message: msg });
    } catch (err) {
      // fallback
      if (typeof originalMethod === 'function') {
        (originalMethod as any)(...args);
      }
    }
  };
}

export default logger;
export { sanitizeObject };
