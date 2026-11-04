import { describe, expect, it } from 'vitest';
import { hashPassword, validatePassword, verifyPassword } from './password';

describe('password', () => {
  it('verifies the right password and refuses a wrong one', async () => {
    const stored = await hashPassword('correct-horse');
    expect(stored).not.toContain('correct-horse');
    expect(await verifyPassword('correct-horse', stored)).toBe(true);
    expect(await verifyPassword('wrong', stored)).toBe(false);
  });

  it('salts every hash', async () => {
    expect(await hashPassword('same-password')).not.toBe(await hashPassword('same-password'));
  });

  it('refuses a malformed stored value', async () => {
    expect(await verifyPassword('x', 'plain-text')).toBe(false);
  });

  it('requires at least 8 characters', () => {
    expect(validatePassword('short')).not.toBeNull();
    expect(validatePassword('long-enough')).toBeNull();
  });
});
