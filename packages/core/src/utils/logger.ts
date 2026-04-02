/** Supported log levels, ordered by verbosity. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Simple leveled logger interface. */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Create a logger that respects the `ALERTHQ_LOG_LEVEL` environment variable.
 *
 * Defaults to `'info'` if the env var is not set or unrecognized.
 */
function createLogger(): Logger {
  const envLevel = (process.env['ALERTHQ_LOG_LEVEL'] ?? 'info').toLowerCase() as LogLevel;
  const threshold = LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= threshold;
  }

  return {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) console.debug(`[alerthq:debug] ${message}`, ...args);
    },
    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) console.info(`[alerthq:info] ${message}`, ...args);
    },
    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) console.warn(`[alerthq:warn] ${message}`, ...args);
    },
    error(message: string, ...args: unknown[]) {
      if (shouldLog('error')) console.error(`[alerthq:error] ${message}`, ...args);
    },
  };
}

/**
 * Shared logger instance for alerthq.
 * Log level is controlled by the `ALERTHQ_LOG_LEVEL` environment variable
 * (`debug`, `info`, `warn`, `error`). Defaults to `info`.
 */
export const logger: Logger = createLogger();
