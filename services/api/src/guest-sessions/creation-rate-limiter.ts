// Fixed-window, in-memory limiter keyed by client address. Single-process only, which fits the
// current single-instance deployment; swap for a shared store if the API is scaled out.
export class CreationRateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly limit: number,
    private readonly windowMs: number,
    private readonly now: () => number = Date.now,
  ) {}

  get size(): number {
    return this.windows.size;
  }

  tryAcquire(key: string): boolean {
    const now = this.now();
    this.evictExpired(now);
    const entry = this.windows.get(key);
    if (!entry) {
      this.windows.set(key, { start: now, count: 1 });
      return true;
    }
    if (entry.count >= this.limit) return false;
    entry.count += 1;
    return true;
  }

  private evictExpired(now: number): void {
    for (const [key, entry] of this.windows) {
      if (now - entry.start >= this.windowMs) this.windows.delete(key);
    }
  }
}
