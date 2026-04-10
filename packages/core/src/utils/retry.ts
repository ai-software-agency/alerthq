/** Options for {@link withRetry}. */
export interface RetryOptions {
  /** Maximum number of retry attempts (default: `3`). */
  retries?: number;

  /** Base delay in milliseconds for exponential backoff (default: `1000`). */
  baseDelay?: number;

  /**
   * Predicate to decide whether an error is retryable.
   * Return `false` to short-circuit retries (e.g. for 400/401/403 responses).
   * Defaults to retrying all errors.
   */
  isRetryable?: (error: unknown) => boolean;

  /** AbortSignal to cancel pending retries early. */
  signal?: AbortSignal;
}

/**
 * Execute an async function with exponential-backoff retries and jitter.
 *
 * On failure, waits `baseDelay * 2^attempt + random(0, baseDelay)` ms
 * before retrying (jitter prevents thundering-herd).
 * If all retries are exhausted, the last error is re-thrown.
 *
 * @param fn - Async function to execute.
 * @param opts - Retry configuration.
 * @returns The resolved value from `fn`.
 * @throws The last error if all retries are exhausted, or if the signal is aborted.
 */
export async function withRetry<T>(fn: () => Promise<T>, opts?: RetryOptions): Promise<T> {
  const retries = opts?.retries ?? 3;
  const baseDelay = opts?.baseDelay ?? 1000;
  const isRetryable = opts?.isRetryable ?? (() => true);
  const signal = opts?.signal;

  let lastError: unknown;

  for (let attempt = 0; attempt <= retries; attempt++) {
    if (signal?.aborted) {
      throw signal.reason ?? new Error('Retry aborted');
    }

    try {
      return await fn();
    } catch (error) {
      lastError = error;

      if (!isRetryable(error)) {
        throw error;
      }

      if (attempt < retries) {
        const jitter = Math.random() * baseDelay;
        const delay = baseDelay * Math.pow(2, attempt) + jitter;
        await new Promise((resolve) => setTimeout(resolve, delay));
      }
    }
  }

  throw lastError;
}
