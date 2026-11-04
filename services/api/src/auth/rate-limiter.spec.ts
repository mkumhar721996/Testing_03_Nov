import { describe, expect, it } from 'vitest';
import { RateLimiter } from './rate-limiter';

describe('RateLimiter', () => {
  it('allows up to the maximum per window, then refuses', () => {
    const l = new RateLimiter(2, 1000);
    expect(l.allow('a', 0)).toBe(true);
    expect(l.allow('a', 1)).toBe(true);
    expect(l.allow('a', 2)).toBe(false);
    expect(l.allow('b', 2)).toBe(true);
  });

  it('starts a fresh window once the old one has passed', () => {
    const l = new RateLimiter(1, 1000);
    l.allow('a', 0);
    expect(l.allow('a', 999)).toBe(false);
    expect(l.allow('a', 1000)).toBe(true);
  });
});
