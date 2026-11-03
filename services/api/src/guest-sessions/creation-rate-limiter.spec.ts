import { describe, expect, it } from 'vitest';
import { CreationRateLimiter } from './creation-rate-limiter';

describe('CreationRateLimiter', () => {
  it('allows up to the limit per key then blocks', () => {
    const limiter = new CreationRateLimiter(2, 60_000, () => 0);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(false);
  });

  it('tracks keys independently', () => {
    const limiter = new CreationRateLimiter(1, 60_000, () => 0);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('b')).toBe(true);
  });

  it('allows again once the window has passed', () => {
    let now = 0;
    const limiter = new CreationRateLimiter(1, 1000, () => now);
    expect(limiter.tryAcquire('a')).toBe(true);
    expect(limiter.tryAcquire('a')).toBe(false);
    now = 1001;
    expect(limiter.tryAcquire('a')).toBe(true);
  });

  it('forgets expired keys so memory stays bounded', () => {
    let now = 0;
    const limiter = new CreationRateLimiter(1, 1000, () => now);
    limiter.tryAcquire('a');
    now = 1001;
    limiter.tryAcquire('b');
    expect(limiter.size).toBe(1);
  });
});
