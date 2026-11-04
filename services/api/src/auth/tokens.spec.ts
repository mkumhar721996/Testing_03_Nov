import { describe, expect, it } from 'vitest';
import { hashToken, newToken } from './tokens';

describe('tokens', () => {
  it('returns a random token and the hash that is stored for it', () => {
    const a = newToken();
    const b = newToken();
    expect(a.token).not.toBe(b.token);
    expect(a.tokenHash).toBe(hashToken(a.token));
    expect(a.tokenHash).not.toContain(a.token);
  });
});
