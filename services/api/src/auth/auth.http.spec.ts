import { Controller, Get, type INestApplication } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Test } from '@nestjs/testing';
import type { AddressInfo } from 'node:net';
import { afterAll, beforeAll, beforeEach, describe, expect, it } from 'vitest';
import { HealthController } from '../health/health.controller';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config';
import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthService, CLOCK } from './auth.service';
import { EMAIL_SENDER, type EmailSender } from './email.sender';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { hashPassword } from './password';
import { SessionGuard } from './session.guard';

const EMAIL = 'priya.raman@northwind.example';
const PASSWORD = 'correct-horse';

@Controller('protected')
class ProtectedController {
  @Get()
  get() {
    return { secret: true };
  }
}

const sent: string[] = [];
const mailer: EmailSender = {
  sendPasswordReset: async (_to, link) => {
    sent.push(link);
  },
};

let now = new Date('2026-01-01T09:00:00Z');
let app: INestApplication;
let base: string;
let repo: InMemoryAuthRepository;

async function call(method: string, path: string, body?: unknown, cookie?: string) {
  const res = await fetch(`${base}${path}`, {
    method,
    headers: { 'content-type': 'application/json', ...(cookie ? { cookie } : {}) },
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await res.text();
  return {
    status: res.status,
    body: text ? JSON.parse(text) : undefined,
    setCookie: res.headers.get('set-cookie'),
  };
}

const signIn = (email: string, password: string) => call('POST', '/auth/sign-in', { email, password });
const cookieOf = (setCookie: string | null) => (setCookie ?? '').split(';')[0];

beforeAll(async () => {
  repo = new InMemoryAuthRepository(() => now);
  const moduleRef = await Test.createTestingModule({
    controllers: [AuthController, HealthController, ProtectedController],
    providers: [
      AuthService,
      { provide: AUTH_REPOSITORY, useValue: repo },
      { provide: EMAIL_SENDER, useValue: mailer },
      { provide: AUTH_CONFIG, useValue: loadAuthConfig({}) },
      { provide: CLOCK, useValue: () => now },
      { provide: APP_GUARD, useClass: SessionGuard },
    ],
  }).compile();
  app = moduleRef.createNestApplication();
  await app.listen(0);
  base = `http://127.0.0.1:${(app.getHttpServer().address() as AddressInfo).port}`;
  await repo.createUser({
    id: 'u1',
    email: EMAIL,
    name: 'Priya Raman',
    passwordHash: await hashPassword(PASSWORD),
  });
});

afterAll(async () => {
  await app.close();
});

beforeEach(async () => {
  now = new Date('2026-01-01T09:00:00Z');
  sent.length = 0;
  await repo.clearFailures('u1');
});

describe('auth over HTTP', () => {
  it('signs in with an HttpOnly cookie, reads the session, and signs out (AC1, AC2)', async () => {
    const res = await signIn(EMAIL, PASSWORD);
    expect(res.status).toBe(200);
    expect(res.setCookie).toMatch(/^sid=.*HttpOnly/);
    expect(res.setCookie).toContain('SameSite=Lax');
    const cookie = cookieOf(res.setCookie);

    expect((await call('GET', '/auth/session', undefined, cookie)).body.email).toBe(EMAIL);
    expect((await call('GET', '/protected', undefined, cookie)).status).toBe(200);

    expect((await call('POST', '/auth/sign-out', undefined, cookie)).status).toBe(204);
    expect((await call('GET', '/auth/session', undefined, cookie)).status).toBe(401);
  });

  it('protects every route except health and the public auth routes (AC5)', async () => {
    expect((await call('GET', '/protected')).status).toBe(401);
    expect((await call('GET', '/auth/session')).status).toBe(401);
    expect((await call('GET', '/protected', undefined, 'sid=forged')).status).toBe(401);
    expect((await call('GET', '/health')).status).toBe(200);
  });

  it('rejects a session that has been idle too long (AC5)', async () => {
    const cookie = cookieOf((await signIn(EMAIL, PASSWORD)).setCookie);
    now = new Date(now.getTime() + 31 * 60_000);
    expect((await call('GET', '/protected', undefined, cookie)).status).toBe(401);
  });

  it('refuses a wrong password and an unknown email with the same 401 body (AC6, AC7, AC8)', async () => {
    const wrong = await signIn(EMAIL, 'wrong');
    const unknown = await signIn('nobody@northwind.example', 'wrong');
    expect(wrong.status).toBe(401);
    expect(unknown.status).toBe(401);
    expect(unknown.body).toEqual(wrong.body);
    expect(unknown.setCookie).toBeNull();
  });

  it('answers 423 on the fifth wrong password and keeps refusing the right one (AC10, AC11, AC12)', async () => {
    for (let i = 0; i < 4; i++) expect((await signIn(EMAIL, 'bad')).status).toBe(401);
    const fifth = await signIn(EMAIL, 'bad');
    expect(fifth.status).toBe(423);
    expect(fifth.body.code).toBe('account_locked');
    expect((await signIn(EMAIL, PASSWORD)).status).toBe(423);
    now = new Date(now.getTime() + 15 * 60_000);
    expect((await signIn(EMAIL, PASSWORD)).status).toBe(200);
  });

  it('resets a password through a single-use link (AC3, AC4, AC9, AC13)', async () => {
    const known = await call('POST', '/auth/password-reset/request', { email: EMAIL });
    const unknown = await call('POST', '/auth/password-reset/request', { email: 'nobody@northwind.example' });
    expect(known.status).toBe(202);
    expect(unknown.status).toBe(202);
    expect(unknown.body).toEqual(known.body);
    expect(sent).toHaveLength(1);

    const token = new URL(sent[0].replace('/#/', '/')).searchParams.get('token');
    expect((await call('GET', `/auth/password-reset/${token}`)).status).toBe(204);
    const weak = await call('POST', '/auth/password-reset/confirm', { token, password: 'short' });
    expect(weak.status).toBe(422);
    const done = await call('POST', '/auth/password-reset/confirm', { token, password: 'new-passw0rd' });
    expect(done.status).toBe(204);

    expect((await call('GET', `/auth/password-reset/${token}`)).status).toBe(410);
    const reused = await call('POST', '/auth/password-reset/confirm', { token, password: 'other-passw0rd' });
    expect(reused.status).toBe(410);
    expect((await signIn(EMAIL, PASSWORD)).status).toBe(401);
    expect((await signIn(EMAIL, 'new-passw0rd')).status).toBe(200);
    // Restore for later tests.
    await repo.updatePassword('u1', await hashPassword(PASSWORD));
  });
});
