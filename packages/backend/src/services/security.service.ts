interface RateLimitEntry {
  count: number;
  resetAt: number;
}

export class RateLimiter {
  private store = new Map<string, RateLimitEntry>();
  private cleanupInterval?: NodeJS.Timeout;

  constructor(
    private windowMs: number = 60 * 1000,
    private maxRequests: number = 60,
    private cleanupIntervalMs: number = 60 * 1000,
  ) {
    this.startCleanup();
  }

  check(identifier: string): {
    allowed: boolean;
    remaining: number;
    resetAt: number;
  } {
    const now = Date.now();
    let entry = this.store.get(identifier);

    // Reset if expired
    if (!entry || now > entry.resetAt) {
      entry = { count: 0, resetAt: now + this.windowMs };
      this.store.set(identifier, entry);
    }

    // Increment and check
    entry.count++;
    const allowed = entry.count <= this.maxRequests;
    const remaining = Math.max(0, this.maxRequests - entry.count);

    return { allowed, remaining, resetAt: entry.resetAt };
  }

  // Returns headers for rate limit info
  getHeaders(identifier: string): Record<string, string> {
    const entry = this.store.get(identifier);
    if (!entry) {
      return {
        "X-RateLimit-Limit": this.maxRequests.toString(),
        "X-RateLimit-Remaining": this.maxRequests.toString(),
        "X-RateLimit-Reset": (Date.now() + this.windowMs).toString(),
      };
    }

    const remaining = Math.max(0, this.maxRequests - entry.count);
    return {
      "X-RateLimit-Limit": this.maxRequests.toString(),
      "X-RateLimit-Remaining": remaining.toString(),
      "X-RateLimit-Reset": entry.resetAt.toString(),
    };
  }

  private startCleanup() {
    this.cleanupInterval = setInterval(() => {
      const now = Date.now();
      for (const [key, entry] of this.store) {
        if (now > entry.resetAt) {
          this.store.delete(key);
        }
      }
    }, this.cleanupIntervalMs);
  }

  // Clean up interval on app shutdown
  stopCleanup() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
  }
}
