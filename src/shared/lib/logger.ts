/**
 * Dev-only logger. In production builds, Vite dead-code-eliminates the
 * entire `if (DEV)` branch, so these calls have zero runtime cost and
 * zero noise in the user's console.
 *
 * Use instead of raw `console.log`/`console.warn`/`console.error` for any
 * debug output you don't want to ship.
 */
const DEV = import.meta.env.DEV;

export const logger = {
  log: (...args: unknown[]) => {
    if (DEV) console.log(...args);
  },
  warn: (...args: unknown[]) => {
    if (DEV) console.warn(...args);
  },
  error: (...args: unknown[]) => {
    // Errors are always logged (could hide real production issues otherwise)
    console.error(...args);
  },
  debug: (...args: unknown[]) => {
    if (DEV) console.debug(...args);
  },
};
