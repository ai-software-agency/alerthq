/** Supported log levels, ordered by verbosity. */
export type LogLevel = 'debug' | 'info' | 'warn' | 'error';

const LOG_LEVELS: Record<LogLevel, number> = {
  debug: 0,
  info: 1,
  warn: 2,
  error: 3,
};

/** Structured log entry emitted by the logger. */
interface LogEntry {
  timestamp: string;
  level: LogLevel;
  msg: string;
  [key: string]: unknown;
}

/** Simple leveled logger interface. */
export interface Logger {
  debug(message: string, ...args: unknown[]): void;
  info(message: string, ...args: unknown[]): void;
  warn(message: string, ...args: unknown[]): void;
  error(message: string, ...args: unknown[]): void;
}

/**
 * Create a structured JSON logger that respects the `ALERTHQ_LOG_LEVEL`
 * environment variable.
 *
 * Each log line is a single JSON object with `timestamp`, `level`, and `msg`
 * fields. Additional arguments are spread as `data` if present.
 *
 * Defaults to `'info'` if the env var is not set or unrecognized.
 */
function createLogger(): Logger {
  const envLevel = (process.env['ALERTHQ_LOG_LEVEL'] ?? 'info').toLowerCase() as LogLevel;
  const threshold = LOG_LEVELS[envLevel] ?? LOG_LEVELS.info;

  function shouldLog(level: LogLevel): boolean {
    return LOG_LEVELS[level] >= threshold;
  }

  function emit(level: LogLevel, message: string, args: unknown[]): void {
    const entry: LogEntry = {
      timestamp: new Date().toISOString(),
      level,
      msg: message,
    };
    if (args.length > 0) {
      entry.data = args.length === 1 ? args[0] : args;
    }

    const line = JSON.stringify(entry);
    switch (level) {
      case 'debug':
        console.debug(line);
        break;
      case 'info':
        console.info(line);
        break;
      case 'warn':
        console.warn(line);
        break;
      case 'error':
        console.error(line);
        break;
    }
  }

  return {
    debug(message: string, ...args: unknown[]) {
      if (shouldLog('debug')) emit('debug', message, args);
    },
    info(message: string, ...args: unknown[]) {
      if (shouldLog('info')) emit('info', message, args);
    },
    warn(message: string, ...args: unknown[]) {
      if (shouldLog('warn')) emit('warn', message, args);
    },
    error(message: string, ...args: unknown[]) {
      if (shouldLog('error')) emit('error', message, args);
    },
  };
}

/**
 * Shared logger instance for alerthq.
 * Log level is controlled by the `ALERTHQ_LOG_LEVEL` environment variable
 * (`debug`, `info`, `warn`, `error`). Defaults to `info`.
 *
 * Output is structured JSON — one object per line with `timestamp`, `level`,
 * and `msg` fields.
 */
export const logger: Logger = createLogger();
