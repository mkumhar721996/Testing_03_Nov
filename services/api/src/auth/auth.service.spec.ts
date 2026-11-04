import { beforeEach, describe, expect, it } from 'vitest';
import { AuthService } from './auth.service';
import { loadAuthConfig } from './auth.config';
import type { EmailSender } from './email.sender';
import { InMemoryAuthRepository } from './in-memory-auth.repository';
import { hashPassword } from './password';

const EMAIL = 'priya.raman@northwind.example';
const PASSWORD = 'correct-horse';
const MIN = 60_000;

class FakeMailer implements EmailSender {
  sent: { email: string; link: string }[] = [];
  async sendPasswordReset(to: { email: string }, link: string) {
    this.sent.push({ email: to.email, link });
  }
  lastToken(): string {
    const link = this.sent[this.sent.length - 1].link;
    return new URL(link.replace('/#/', '/')).searchParams.get('token') as string;
  }
}

let now: Date;
let repo: InMemoryAuthRepository;
let mailer: FakeMailer;
let svc: AuthService;
const advance = (ms: number) => {
  now = new Date(now.getTime() + ms);
};

beforeEach(async () => {
  now = new Date('2026-01-01T09:00:00Z');
  repo = new InMemoryAuthRepository(() => now);
  mailer = new FakeMailer();
  svc = new AuthService(repo, mailer, loadAuthConfig({}), () => now);
  await repo.createUser({
    id: 'u1',
    email: EMAIL,
    name: 'Priya Raman',
    passwordHash: await hashPassword(PASSWORD),
  });
});

describe('AuthService sign-in', () => {
  it('signs in with email and password, ignoring email case (AC1)', async () => {
    const r = await svc.signIn('Priya.Raman@Northwind.example', PASSWORD);
    expect(r.kind).toBe('ok');
    expect(repo.sessionCount()).toBe(1);
  });

  it('refuses a wrong password (AC6)', async () => {
    expect((await svc.signIn(EMAIL, 'wrong')).kind).toBe('invalid');
  });

  it('answers identically for a wrong password and an unknown email (AC7)', async () => {
    expect(await svc.signIn(EMAIL, 'wrong')).toEqual(await svc.signIn('nobody@northwind.example', 'wrong'));
  });

  it('refuses an unknown email and creates no session (AC8)', async () => {
    expect((await svc.signIn('nobody@northwind.example', 'anything')).kind).toBe('invalid');
    expect(repo.sessionCount()).toBe(0);
  });
});

describe('AuthService sessions', () => {
  it('stops resolving a session after sign-out (AC2)', async () => {
    const r = await svc.signIn(EMAIL, PASSWORD);
    if (r.kind !== 'ok') throw new Error('expected ok');
    expect((await svc.resolveSession(r.sessionToken))?.email).toBe(EMAIL);
    await svc.signOut(r.sessionToken);
    expect(await svc.resolveSession(r.sessionToken)).toBeNull();
  });

  it('resolves nothing for a missing or unknown token (AC5)', async () => {
    expect(await svc.resolveSession(undefined)).toBeNull();
    expect(await svc.resolveSession('unknown')).toBeNull();
  });

  it('expires after 30 idle minutes but slides while in use (AC5)', async () => {
    const r = await svc.signIn(EMAIL, PASSWORD);
    if (r.kind !== 'ok') throw new Error('expected ok');
    advance(20 * MIN);
    expect(await svc.resolveSession(r.sessionToken)).not.toBeNull();
    advance(20 * MIN);
    expect(await svc.resolveSession(r.sessionToken)).not.toBeNull();
    advance(31 * MIN);
    expect(await svc.resolveSession(r.sessionToken)).toBeNull();
  });

  it('expires after 8 hours however active it is (AC5)', async () => {
    const r = await svc.signIn(EMAIL, PASSWORD);
    if (r.kind !== 'ok') throw new Error('expected ok');
    for (let i = 0; i < 16; i++) {
      advance(29 * MIN);
      expect(await svc.resolveSession(r.sessionToken)).not.toBeNull();
    }
    advance(29 * MIN);
    expect(await svc.resolveSession(r.sessionToken)).toBeNull();
  });
});

describe('AuthService lockout', () => {
  async function failFive() {
    for (let i = 0; i < 4; i++) expect((await svc.signIn(EMAIL, 'bad')).kind).toBe('invalid');
    expect((await svc.signIn(EMAIL, 'bad')).kind).toBe('locked');
  }

  it('locks on the fifth consecutive wrong password (AC10)', async () => {
    await failFive();
  });

  it('resets the counter on a successful sign-in (AC10)', async () => {
    for (let i = 0; i < 4; i++) await svc.signIn(EMAIL, 'bad');
    expect((await svc.signIn(EMAIL, PASSWORD)).kind).toBe('ok');
    for (let i = 0; i < 4; i++) expect((await svc.signIn(EMAIL, 'bad')).kind).toBe('invalid');
  });

  it('refuses the correct password inside the 15-minute lock (AC11)', async () => {
    await failFive();
    advance(14 * MIN + 59_000);
    expect((await svc.signIn(EMAIL, PASSWORD)).kind).toBe('locked');
    expect(repo.sessionCount()).toBe(0);
  });

  it('accepts the correct password once 15 minutes passed and clears the counter (AC12)', async () => {
    await failFive();
    advance(15 * MIN);
    expect((await svc.signIn(EMAIL, PASSWORD)).kind).toBe('ok');
    expect((await svc.signIn(EMAIL, 'bad')).kind).toBe('invalid');
  });
});

describe('AuthService lock race', () => {
  it('refuses a correct password when the account locked during the verify', async () => {
    const stale = await repo.findUserByEmail(EMAIL);
    for (let i = 0; i < 5; i++) await repo.recordFailedAttempt('u1', now, 5, 15 * MIN);
    // A parallel request read the row before the lock landed.
    repo.findUserByEmail = async () => stale;
    expect((await svc.signIn(EMAIL, PASSWORD)).kind).toBe('locked');
    expect(repo.sessionCount()).toBe(0);
  });
});

describe('AuthService password reset', () => {
  it('stops sending after three requests an hour for one account, answering the same', async () => {
    for (let i = 0; i < 5; i++) expect(await svc.requestReset(EMAIL)).toBeUndefined();
    expect(mailer.sent).toHaveLength(3);
    advance(61 * MIN);
    await svc.requestReset(EMAIL);
    expect(mailer.sent).toHaveLength(4);
  });

  it('sets a new password that signs in, and revokes other sessions (AC3)', async () => {
    const r = await svc.signIn(EMAIL, PASSWORD);
    if (r.kind !== 'ok') throw new Error('expected ok');
    await svc.requestReset(EMAIL);
    const token = mailer.lastToken();
    expect(repo.tokenHashes).not.toContain(token);
    expect(await svc.confirmReset(token, 'new-passw0rd')).toBe('ok');
    expect((await svc.signIn(EMAIL, 'new-passw0rd')).kind).toBe('ok');
    expect(await svc.resolveSession(r.sessionToken)).toBeNull();
  });

  it('refuses the old password after a reset (AC4)', async () => {
    await svc.requestReset(EMAIL);
    await svc.confirmReset(mailer.lastToken(), 'new-passw0rd');
    expect((await svc.signIn(EMAIL, PASSWORD)).kind).toBe('invalid');
  });

  it('refuses an expired link (AC9)', async () => {
    await svc.requestReset(EMAIL);
    const token = mailer.lastToken();
    advance(61 * MIN);
    expect(await svc.checkResetToken(token)).toBe(false);
    expect(await svc.confirmReset(token, 'new-passw0rd')).toBe('invalid-link');
  });

  it('refuses a link that was already used (AC9)', async () => {
    await svc.requestReset(EMAIL);
    const token = mailer.lastToken();
    expect(await svc.checkResetToken(token)).toBe(true);
    expect(await svc.confirmReset(token, 'a-passw0rd1')).toBe('ok');
    expect(await svc.checkResetToken(token)).toBe(false);
    expect(await svc.confirmReset(token, 'another-passw0rd')).toBe('invalid-link');
  });

  it('refuses a weak password without using up the link', async () => {
    await svc.requestReset(EMAIL);
    const token = mailer.lastToken();
    expect(await svc.confirmReset(token, 'short')).toBe('weak-password');
    expect(await svc.confirmReset(token, 'long-enough-1')).toBe('ok');
  });

  it('lifts a lock when the password is reset', async () => {
    for (let i = 0; i < 5; i++) await svc.signIn(EMAIL, 'bad');
    await svc.requestReset(EMAIL);
    await svc.confirmReset(mailer.lastToken(), 'new-passw0rd');
    expect((await svc.signIn(EMAIL, 'new-passw0rd')).kind).toBe('ok');
  });

  it('answers a request for an unknown email like a known one and sends no mail (AC13)', async () => {
    expect(await svc.requestReset('nobody@northwind.example')).toBeUndefined();
    expect(mailer.sent).toHaveLength(0);
    expect(await svc.requestReset(EMAIL)).toBeUndefined();
    expect(mailer.sent).toHaveLength(1);
  });
});
