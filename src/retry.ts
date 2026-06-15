export interface RetryConfig {
  maxRetries: number;
  baseDelayMs: number;
  maxDelayMs: number;
  retryableStatuses: number[];
}

const DEFAULT_RETRY_CONFIG: RetryConfig = {
  maxRetries: 3,
  baseDelayMs: 1000,
  maxDelayMs: 30_000,
  retryableStatuses: [429, 500, 502, 503, 504],
};

function isRetryableError(error: unknown, retryableStatuses: number[]): boolean {
  if (error instanceof TypeError) {
    const msg = error.message.toLowerCase();
    return (
      msg.includes("fetch failed") ||
      msg.includes("network error") ||
      msg.includes("timeout") ||
      msg.includes("abort") ||
      msg.includes("econnrefused") ||
      msg.includes("econnreset") ||
      msg.includes("etimedout") ||
      msg.includes("enotfound")
    );
  }

  if (error instanceof Response) {
    return retryableStatuses.includes(error.status);
  }

  return false;
}

export class RetryError extends Error {
  attempts: number;
  lastError: unknown;

  constructor(message: string, attempts: number, lastError: unknown) {
    super(message);
    this.name = "RetryError";
    this.attempts = attempts;
    this.lastError = lastError;
  }
}

export async function fetchWithRetry(
  url: string,
  init: RequestInit,
  config?: Partial<RetryConfig>,
): Promise<Response> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      const response = await fetch(url, init);

      if (cfg.retryableStatuses.includes(response.status) && attempt < cfg.maxRetries) {
        lastError = new Error(
          `Retryable HTTP ${response.status} on attempt ${attempt + 1}`,
        );
        await delayForAttempt(attempt, cfg.baseDelayMs, cfg.maxDelayMs);
        continue;
      }

      return response;
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err, cfg.retryableStatuses) || attempt >= cfg.maxRetries) {
        throw err;
      }
      await delayForAttempt(attempt, cfg.baseDelayMs, cfg.maxDelayMs);
    }
  }

  throw new RetryError(
    `All ${cfg.maxRetries + 1} attempts failed`,
    cfg.maxRetries + 1,
    lastError,
  );
}

function delayForAttempt(
  attempt: number,
  baseMs: number,
  maxMs: number,
): Promise<void> {
  const delay = Math.min(baseMs * Math.pow(2, attempt), maxMs);
  const jitter = delay * 0.1 * Math.random();
  return new Promise((resolve) => setTimeout(resolve, delay + jitter));
}

export async function withRetry<T>(
  fn: () => Promise<T>,
  config?: Partial<RetryConfig>,
): Promise<T> {
  const cfg = { ...DEFAULT_RETRY_CONFIG, ...config };
  let lastError: unknown;

  for (let attempt = 0; attempt <= cfg.maxRetries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      lastError = err;
      if (!isRetryableError(err, cfg.retryableStatuses) || attempt >= cfg.maxRetries) {
        throw err;
      }
      await delayForAttempt(attempt, cfg.baseDelayMs, cfg.maxDelayMs);
    }
  }

  throw new RetryError(
    `All ${cfg.maxRetries + 1} attempts failed`,
    cfg.maxRetries + 1,
    lastError,
  );
}
