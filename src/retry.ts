export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  retryableStatuses: number[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

interface ErrorWithCode extends Error {
  code: number;
}

function hasStatusCode(err: unknown): err is ErrorWithCode {
  return (
    typeof err === "object" &&
    err !== null &&
    "code" in err &&
    typeof (err as Record<string, unknown>).code === "number"
  );
}

export function isRetryableStatus(
  err: unknown,
  retryableStatuses: number[],
): boolean {
  if (!hasStatusCode(err)) return false;
  return retryableStatuses.includes(err.code);
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const { maxRetries, baseDelayMs, retryableStatuses } = {
    ...DEFAULT_RETRY_CONFIG,
    ...config,
  };

  let lastError: unknown;

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;

      if (
        attempt >= maxRetries ||
        !isRetryableStatus(err, retryableStatuses)
      ) {
        throw err;
      }

      const delay = baseDelayMs * Math.pow(2, attempt);
      console.error(
        `Request failed with retryable status, attempt ${attempt + 1}/${maxRetries}, retrying in ${delay}ms`,
      );

      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw lastError;
}
