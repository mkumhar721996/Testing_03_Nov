import { describe, expect, it } from 'vitest';
import { loadAuthConfig } from '../auth/auth.config';
import { AuthService } from '../auth/auth.service';
import { InMemoryAuthRepository } from '../auth/in-memory-auth.repository';
import { createUserAccount } from './create-user';

describe('createUserAccount', () => {
  it('creates a user who can then sign in, ignoring email case (AC1)', async () => {
    const repo = new InMemoryAuthRepository();
    const svc = new AuthService(repo, { sendPasswordReset: async () => {} }, loadAuthConfig({}), () => new Date());
    const { id } = await createUserAccount(repo, { email: 'New@Northwind.example', name: 'New', password: 'long-enough-1' });
    expect(id).toBeTruthy();
    expect((await svc.signIn('new@northwind.example', 'long-enough-1')).kind).toBe('ok');
  });

  it('rejects a duplicate email regardless of case', async () => {
    const repo = new InMemoryAuthRepository();
    await createUserAccount(repo, { email: 'New@Northwind.example', name: 'New', password: 'long-enough-1' });
    await expect(
      createUserAccount(repo, { email: 'new@northwind.example', name: 'X', password: 'long-enough-1' }),
    ).rejects.toThrow();
  });

  it('rejects a weak password', async () => {
    await expect(
      createUserAccount(new InMemoryAuthRepository(), { email: 'b@northwind.example', name: 'B', password: 'short' }),
    ).rejects.toThrow();
  });
});
