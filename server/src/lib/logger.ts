/**
 * Server-side dev-only logger. Mirrors the client `shared/lib/logger.ts`
 * API so callers can use the same import shape.
 *
 * Errors are always printed (production errors should be visible).
 * log/warn/debug are gated on `NODE_ENV !== 'production'`.
 */
const IS_PROD = process.env.NODE_ENV === 'production';

export const logger = {
  log: (...args: unknown[]) => {
    if (!IS_PROD) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (!IS_PROD) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (!IS_PROD) console.debug(...args);
  },
};
