import { UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { describe, expect, it } from 'vitest';
import { HealthController } from '../health/health.controller';
import { AuthController } from './auth.controller';
import { loadAuthConfig } from './auth.config';
import { AuthService } from './auth.service';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { hashPassword } from './password';
import { IS_PUBLIC, Public } from './public.decorator';
import { SessionGuard } from './session.guard';

class Sample {
  @Public()
  open() {}
  closed() {}
}

function context(cookie: string | undefined, handler: () => void): ExecutionContext {
  const req = { headers: cookie ? { cookie } : {} };
  return {
    getHandler: () => handler,
    getClass: () => Sample,
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

async function setup() {
  let now = new Date('2026-01-01T09:00:00Z');
  const repo = new InMemoryAuthRepository(() => now);
  const svc = new AuthService(repo, { sendPasswordReset: async () => {} }, loadAuthConfig({}), () => now);
  await repo.createUser({ id: 'u1', email: 'a@northwind.example', name: 'A', passwordHash: await hashPassword('correct-horse') });
  const guard = new SessionGuard(new Reflector(), svc);
  return { svc, guard, advance: (ms: number) => (now = new Date(now.getTime() + ms)) };
}

describe('SessionGuard', () => {
  it('passes a @Public() route without a session', async () => {
    const { guard } = await setup();
    expect(await guard.canActivate(context(undefined, Sample.prototype.open))).toBe(true);
  });

  it.each([
    ['no cookie', undefined],
    ['an unknown token', 'sid=unknown'],
  ])('refuses %s with 401 (AC5)', async (_name, cookie) => {
    const { guard } = await setup();
    await expect(guard.canActivate(context(cookie, Sample.prototype.closed))).rejects.toThrow(
      UnauthorizedException,
    );
  });

  it('admits a live session and refuses it once it has expired (AC5)', async () => {
    const { svc, guard, advance } = await setup();
    const r = await svc.signIn('a@northwind.example', 'correct-horse');
    if (r.kind !== 'ok') throw new Error('expected ok');
    const cookie = `sid=${r.sessionToken}`;
    expect(await guard.canActivate(context(cookie, Sample.prototype.closed))).toBe(true);
    advance(31 * 60_000);
    await expect(guard.canActivate(context(cookie, Sample.prototype.closed))).rejects.toThrow(
      UnauthorizedException,
    );
  });
});

describe('route table', () => {
  const publicHandlers = (controller: { prototype: object }) =>
    Object.getOwnPropertyNames(controller.prototype)
      .filter((n) => n !== 'constructor')
      .filter((n) => Reflect.getMetadata(IS_PUBLIC, (controller.prototype as Record<string, object>)[n]))
      .sort();

  it('marks only health, sign-in and the three reset routes public', () => {
    expect(publicHandlers(HealthController)).toEqual(['check']);
    expect(publicHandlers(AuthController)).toEqual(['checkReset', 'confirmReset', 'requestReset', 'signIn']);
  });
});
