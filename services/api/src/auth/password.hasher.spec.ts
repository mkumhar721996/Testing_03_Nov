import { describe, expect, it } from 'vitest';
import { hashPassword, verifyPassword } from './password.hasher';

describe('password hasher', () => {
  it('verifies the right password and rejects others', async () => {
    const stored = await hashPassword('Passw0rd1');
    expect(stored).not.toContain('Passw0rd1');
    expect(await verifyPassword('Passw0rd1', stored)).toBe(true);
    expect(await verifyPassword('Passw0rd2', stored)).toBe(false);
  });

  it('salts: two hashes of one password differ', async () => {
    expect(await hashPassword('Passw0rd1')).not.toBe(await hashPassword('Passw0rd1'));
  });

  it('rejects a malformed stored value', async () => {
    expect(await verifyPassword('x', 'garbage')).toBe(false);
  });
});
