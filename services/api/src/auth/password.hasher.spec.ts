import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.hasher';

describe('password hasher', () => {
  it('verifies the right password and refuses another', async () => {
    const stored = await hashPassword('Passw0rd1');
    expect(await verifyPassword('Passw0rd1', stored)).toBe(true);
    expect(await verifyPassword('Passw0rd2', stored)).toBe(false);
  });

  it('does not store the password and salts each hash', async () => {
    const a = await hashPassword('Passw0rd1');
    const b = await hashPassword('Passw0rd1');
    expect(a).not.toContain('Passw0rd1');
    expect(a).not.toBe(b);
  });

  it('refuses a malformed stored value', async () => {
    expect(await verifyPassword('Passw0rd1', 'garbage')).toBe(false);
  });
});
