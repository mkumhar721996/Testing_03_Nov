import { describe, expect, it } from 'vitest';
import { readCookie } from './cookie';

describe('readCookie', () => {
  it('finds a cookie among several', () => {
    expect(readCookie('a=1; guest_session=abc; b=2', 'guest_session')).toBe('abc');
  });
  it('returns undefined when absent or no header', () => {
    expect(readCookie('a=1', 'guest_session')).toBeUndefined();
    expect(readCookie(undefined, 'guest_session')).toBeUndefined();
  });
});
