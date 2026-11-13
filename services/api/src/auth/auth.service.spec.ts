import { describe, expect, it } from 'vitest';
import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { SESSION_TTL_MS } from './auth.constants';
import { AuthService } from './auth.service';
import { FakeAccountRepository } from './fake-account.repository';
import { hashPassword } from './password.hasher';

const MIN = 60 * 1000;

function setup() {
  const repo = new FakeAccountRepository();
  let now = new Date('2026-01-01T09:00:00Z');
  const clock = Object.assign(() => now, {
    advance: (ms: number) => {
      now = new Date(now.getTime() + ms);
    },
  });
  return { repo, clock, service: new AuthService(repo, clock) };
}

async function failFive(service: AuthService) {
  for (let i = 0; i < 5; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
}

describe('AuthService', () => {
  it('registers and signs the visitor in (AC1, AC9)', async () => {
    const { service, repo } = setup();
    const res = await service.register('sam@example.com', 'Passw0rd1');
    expect(res.user).toMatchObject({ email: 'sam@example.com', role: 'customer' });
    expect(await service.sessionFor(res.token)).toMatchObject({ email: 'sam@example.com' });
    expect((await repo.findByEmail('sam@example.com'))?.passwordHash).not.toContain('Passw0rd1');
  });

  it('signs in with correct credentials, email case-insensitive (AC2)', async () => {
    const { service } = setup();
    const first = await service.register('sam@example.com', 'Passw0rd1');
    await service.signOut(first.token);
    const again = await service.signIn('SAM@Example.com ', 'Passw0rd1');
    expect(again.user.id).toBe(first.user.id);
  });

  it('refuses wrong password and unknown email identically (AC3)', async () => {
    const { service, repo } = setup();
    await service.register('sam@example.com', 'Passw0rd1');
    const wrong = await service.signIn('sam@example.com', 'WrongPass9').catch((e) => e);
    const unknown = await service.signIn('nobody@example.com', 'Passw0rd1').catch((e) => e);
    expect(wrong).toBeInstanceOf(UnauthorizedException);
    expect(unknown).toBeInstanceOf(UnauthorizedException);
    expect(wrong.getResponse()).toEqual(unknown.getResponse());
    expect(repo.sessions.size).toBe(1);
  });

  it('ends the session on sign-out (AC5)', async () => {
    const { service } = setup();
    const { token } = await service.register('sam@example.com', 'Passw0rd1');
    await service.signOut(token);
    await expect(service.sessionFor(token)).rejects.toBeInstanceOf(UnauthorizedException);
    await expect(service.sessionFor(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('refuses a duplicate email, case-insensitively (AC7, AC15)', async () => {
    const { service } = setup();
    await service.register('sam@example.com', 'Passw0rd1');
    const err = await service.register('SAM@example.com', 'Passw0rd2').catch((e) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect(err.getResponse()).toMatchObject({ message: 'Registration could not be completed' });
  });

  it.each(['technician', 'admin'] as const)('a %s signs in and reports its own role (AC8)', async (role) => {
    const { service, repo } = setup();
    await repo.create({ id: randomUUID(), email: 'x@example.com', passwordHash: await hashPassword('Passw0rd1'), role });
    expect((await service.signIn('x@example.com', 'Passw0rd1')).user.role).toBe(role);
  });

  it.each(['Pass1', 'password', '12345678'])('refuses password %s (AC10)', async (pw) => {
    const { service, repo } = setup();
    await expect(service.register('sam@example.com', pw)).rejects.toBeInstanceOf(BadRequestException);
    expect(await repo.findByEmail('sam@example.com')).toBeUndefined();
  });

  it('accepts a password of exactly 8 characters (AC11)', async () => {
    const { service } = setup();
    expect((await service.register('new@example.com', 'Passw0rd')).user.email).toBe('new@example.com');
  });

  it.each(['sam.example.com', 'a@b@c.com', 'sam@localhost'])('refuses email %s (AC12)', async (email) => {
    const { service, repo } = setup();
    await expect(service.register(email, 'Passw0rd1')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.accounts).toHaveLength(0);
  });

  it('locks after 5 failures and refuses the correct password for 15 minutes (AC13)', async () => {
    const { service, clock } = setup();
    await service.register('sam@example.com', 'Passw0rd1');
    await failFive(service);
    clock.advance(14 * MIN + 59_000);
    await expect(service.signIn('sam@example.com', 'Passw0rd1')).rejects.toMatchObject({ status: 429 });
  });

  it('unlocks exactly 15 minutes after the fifth failure; attempts while locked do not extend it (AC14)', async () => {
    const { service, clock } = setup();
    await service.register('sam@example.com', 'Passw0rd1');
    await failFive(service);
    clock.advance(10 * MIN);
    await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
    clock.advance(5 * MIN);
    expect((await service.signIn('sam@example.com', 'Passw0rd1')).user.email).toBe('sam@example.com');
  });

  it('4 failures then the right password succeeds, and success resets the count', async () => {
    const { service } = setup();
    await service.register('sam@example.com', 'Passw0rd1');
    for (let i = 0; i < 4; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
    await service.signIn('sam@example.com', 'Passw0rd1');
    for (let i = 0; i < 4; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
    await expect(service.signIn('sam@example.com', 'Passw0rd1')).resolves.toBeDefined();
  });

  it('throttles unknown emails the same way', async () => {
    const { service } = setup();
    for (let i = 0; i < 5; i++) await service.signIn('ghost@example.com', 'Wrong1234').catch(() => {});
    await expect(service.signIn('ghost@example.com', 'Wrong1234')).rejects.toMatchObject({ status: 429 });
  });

  it('expires sessions after the TTL', async () => {
    const { service, clock } = setup();
    const { token } = await service.register('sam@example.com', 'Passw0rd1');
    clock.advance(SESSION_TTL_MS + 1);
    await expect(service.sessionFor(token)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
