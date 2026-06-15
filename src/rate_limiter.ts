export class RateLimiter {
  private lastRequestTime = 0;
  private readonly minIntervalMs: number;

  constructor(requestsPerSecond = 1) {
    this.minIntervalMs = 1000 / requestsPerSecond;
  }

  async acquire(): Promise<void> {
    const now = Date.now();
    const waitTime = this.lastRequestTime + this.minIntervalMs - now;
    if (waitTime > 0) {
      await new Promise((resolve) => setTimeout(resolve, waitTime));
    }
    this.lastRequestTime = Date.now();
  }
}

export const nominatimLimiter = new RateLimiter(1);
export const overpassLimiter = new RateLimiter(1);
