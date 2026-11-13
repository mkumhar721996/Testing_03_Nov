import { describe, expect, it } from 'vitest';
import { AuthThrottleGuard } from './auth-throttle.guard';

describe('AuthThrottleGuard', () => {
  it('refuses requests over the limit per IP and recovers after the window', () => {
    const guard = new AuthThrottleGuard();
    let now = 0;
    guard.now = () => now;
    guard.limit = 3;
    guard.windowMs = 1000;
    for (let i = 0; i < 3; i++) expect(guard.allow('1.1.1.1')).toBe(true);
    expect(() => guard.allow('1.1.1.1')).toThrowError(expect.objectContaining({ status: 429 }));
    expect(guard.allow('2.2.2.2')).toBe(true);
    now = 1000;
    expect(guard.allow('1.1.1.1')).toBe(true);
  });
});
