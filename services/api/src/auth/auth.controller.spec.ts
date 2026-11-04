import { HttpException, UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AuthController } from './auth.controller';
import { loadAuthConfig } from './auth.config';
import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { hashPassword } from './password';

async function setup() {
  const now = new Date('2026-01-01T09:00:00Z');
  const repo = new InMemoryAuthRepository(() => now);
  const svc = new AuthService(repo, { sendPasswordReset: async () => {} }, loadAuthConfig({}), () => now);
  await repo.createUser({ id: 'u1', email: 'a@northwind.example', name: 'A', passwordHash: await hashPassword('correct-horse') });
  const headers: Record<string, string> = {};
  const res = { setHeader: (n: string, v: string) => void (headers[n] = v) };
  return { controller: new AuthController(svc), res, headers };
}

describe('AuthController', () => {
  it('sets an HttpOnly session cookie on sign-in (AC1)', async () => {
    const { controller, res, headers } = await setup();
    const user = await controller.signIn({ email: 'a@northwind.example', password: 'correct-horse' }, res);
    expect(user.email).toBe('a@northwind.example');
    expect(headers['Set-Cookie']).toMatch(/^sid=.*HttpOnly/);
  });

  it('throws 401 for a wrong password and sets no cookie (AC6, AC8)', async () => {
    const { controller, res, headers } = await setup();
    const err = await controller.signIn({ email: 'a@northwind.example', password: 'x' }, res).catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(headers['Set-Cookie']).toBeUndefined();
  });

  it('treats a non-string body as invalid credentials', async () => {
    const { controller, res } = await setup();
    await expect(controller.signIn({ email: 1, password: {} }, res)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('throws 423 on the fifth wrong password (AC10)', async () => {
    const { controller, res } = await setup();
    const body = { email: 'a@northwind.example', password: 'x' };
    for (let i = 0; i < 4; i++) await controller.signIn(body, res).catch(() => {});
    const err = await controller.signIn(body, res).catch((e) => e);
    expect((err as HttpException).getStatus()).toBe(423);
  });

  it('clears the cookie on sign-out (AC2)', async () => {
    const { controller, res, headers } = await setup();
    await controller.signOut({ headers: {} }, res);
    expect(headers['Set-Cookie']).toMatch(/^sid=; Expires=Thu, 01 Jan 1970/);
  });
});
