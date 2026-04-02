/** Options for {@link withRetry}. */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: `3`). */
  retries?: number;

  /** Base delay in milliseconds for exponential backoff (default: `1000`). */
  baseDelay?: number;
}

/**
 * Execute an async function with exponential-backoff retries.
 *
 * On failure, waits `baseDelay * 2^attempt` ms before retrying.
 * If all retries are exhausted, the last error is re-thrown.
 *
 * @param fn - Async function to execute.
 * @param opts - Retry configuration.
 * @returns The resolved value from `fn`.
 * @throws The last error if all retries are exhausted.
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  opts?: RetryOptions,
): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseDelay = opts?.baseDelay ?? 1000;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      lastError = error;
      if (attempt < retries) {
        const delay = baseDelay * Math.pow(2, attempt);
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
