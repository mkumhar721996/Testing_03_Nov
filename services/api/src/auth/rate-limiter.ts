/** Fixed-window counter per key, in memory (one API instance). */
export class RateLimiter {
  private readonly windows = new Map<string, { start: number; count: number }>();

  constructor(
    private readonly max: number,
    private readonly windowMs: number,
  ) {}

  /** Counts one hit; false once the key has used up its allowance in the current window. */
  allow(key: string, nowMs: number): boolean {
    if (this.windows.size > 10_000) this.sweep(nowMs);
    const w = this.windows.get(key);
    if (!w || nowMs - w.start >= this.windowMs) {
      this.windows.set(key, { start: nowMs, count: 1 });
      return true;
    }
    w.count += 1;
    return w.count <= this.max;
  }

  private sweep(nowMs: number): void {
    for (const [key, w] of this.windows) if (nowMs - w.start >= this.windowMs) this.windows.delete(key);
  }
}
