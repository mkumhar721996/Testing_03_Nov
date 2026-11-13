import { BadRequestException, ConflictException, UnauthorizedException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { REGISTER_REFUSED, SESSION_TTL_MS, SIGN_IN_REFUSED, type Role } from './auth.constants';
import { AuthService } from './auth.service';
import { FakeAccountRepository } from './fake-account.repository';
import { hashPassword } from './password.hasher';

const MIN = 60 * 1000;

class TestClock {
  now = new Date('2026-01-01T09:00:00Z');
  read = () => new Date(this.now);
  advance(ms: number) {
    this.now = new Date(this.now.getTime() + ms);
  }
}

describe('AuthService', () => {
  let repo: FakeAccountRepository;
  let clock: TestClock;
  let service: AuthService;

  const seed = async (email: string, password: string, role: Role) =>
    repo.create({ id: `id-${role}`, email, passwordHash: await hashPassword(password), role });
  const failFive = async (email = 'sam@example.com') => {
    for (let i = 0; i < 5; i++) await service.signIn(email, 'Wrong1234').catch(() => {});
  };

  beforeEach(() => {
    repo = new FakeAccountRepository();
    clock = new TestClock();
    service = new AuthService(repo, clock.read);
  });

  describe('register', () => {
    it('signs the new account in with exactly 8 characters (AC1)', async () => {
      const res = await service.register('sam@example.com', 'Passw0rd');
      expect(res.user.email).toBe('sam@example.com');
      expect(await service.sessionFor(res.token)).toMatchObject({ email: 'sam@example.com' });
    });

    it('always creates a customer (AC8)', async () => {
      const res = await service.register('sam@example.com', 'Passw0rd1');
      expect(res.user.role).toBe('customer');
    });

    it('refuses a duplicate email, case-insensitively, with the generic message (AC6)', async () => {
      await service.register('sam@example.com', 'Passw0rd1');
      const err = await service.register('SAM@example.com', 'Passw0rd2').catch((e) => e);
      expect(err).toBeInstanceOf(ConflictException);
      expect(err.message).toBe(REGISTER_REFUSED);
    });

    it.each(['Pass1', 'password', '12345678', 'Passw0r'])('refuses password %s (AC9)', async (pw) => {
      await expect(service.register('sam@example.com', pw)).rejects.toBeInstanceOf(BadRequestException);
      expect(await repo.findByEmail('sam@example.com')).toBeUndefined();
    });

    it.each(['sam.example.com', 'a@b@c.com', 'sam@localhost'])('refuses email %s (AC10)', async (e) => {
      await expect(service.register(e, 'Passw0rd1')).rejects.toBeInstanceOf(BadRequestException);
    });

    it('refuses non-string input', async () => {
      await expect(service.register(undefined as never, 123 as never)).rejects.toBeInstanceOf(BadRequestException);
    });
  });

  describe('signIn', () => {
    it.each(['customer', 'technician', 'admin'] as const)('signs in a %s (AC2)', async (role) => {
      await seed(`${role}@example.com`, 'Passw0rd1', role);
      const res = await service.signIn(`${role.toUpperCase()}@Example.com `, 'Passw0rd1');
      expect(res.user.role).toBe(role);
    });

    it('refuses a wrong password and an unknown email identically (AC3)', async () => {
      await seed('sam@example.com', 'Passw0rd1', 'customer');
      const a = await service.signIn('sam@example.com', 'WrongPass9').catch((e) => e);
      const b = await service.signIn('nobody@example.com', 'Passw0rd1').catch((e) => e);
      expect(a).toBeInstanceOf(UnauthorizedException);
      expect(b).toBeInstanceOf(UnauthorizedException);
      expect(a.message).toBe(SIGN_IN_REFUSED);
      expect(b.message).toBe(SIGN_IN_REFUSED);
    });
  });

  describe('signOut and sessions', () => {
    it('ends the session (AC4)', async () => {
      const { token } = await service.register('sam@example.com', 'Passw0rd1');
      await service.signOut(token);
      await expect(service.sessionFor(token)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('refuses a missing or unknown token', async () => {
      await expect(service.sessionFor(undefined)).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.sessionFor('nope')).rejects.toBeInstanceOf(UnauthorizedException);
      await expect(service.signOut(undefined)).resolves.toBeUndefined();
    });

    it('expires after 12 hours', async () => {
      const { token } = await service.register('sam@example.com', 'Passw0rd1');
      clock.advance(SESSION_TTL_MS - 1);
      await expect(service.sessionFor(token)).resolves.toBeDefined();
      clock.advance(2);
      await expect(service.sessionFor(token)).rejects.toBeInstanceOf(UnauthorizedException);
    });

    it('stores only a hash of the token', async () => {
      const { token } = await service.register('sam@example.com', 'Passw0rd1');
      expect([...repo.sessions.keys()]).not.toContain(token);
    });
  });

  describe('lockout', () => {
    beforeEach(async () => {
      await seed('sam@example.com', 'Passw0rd1', 'customer');
    });

    it('refuses the correct password within 15 minutes of the fifth failure', async () => {
      await failFive();
      clock.advance(14 * MIN + 59_000);
      await expect(service.signIn('sam@example.com', 'Passw0rd1')).rejects.toMatchObject({ status: 429 });
    });

    it('unlocks exactly 15 minutes after the fifth failure, attempts while locked not extending it', async () => {
      await failFive();
      clock.advance(10 * MIN);
      await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
      clock.advance(5 * MIN);
      expect((await service.signIn('sam@example.com', 'Passw0rd1')).user.email).toBe('sam@example.com');
    });

    it('four failures then the correct password succeeds', async () => {
      for (let i = 0; i < 4; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
      await expect(service.signIn('sam@example.com', 'Passw0rd1')).resolves.toBeDefined();
    });

    it('a success resets the count', async () => {
      for (let i = 0; i < 4; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
      await service.signIn('sam@example.com', 'Passw0rd1');
      for (let i = 0; i < 4; i++) await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
      await expect(service.signIn('sam@example.com', 'Passw0rd1')).resolves.toBeDefined();
    });

    it('restarts the count once the previous window has expired', async () => {
      await failFive();
      clock.advance(15 * MIN);
      await service.signIn('sam@example.com', 'Wrong1234').catch(() => {});
      await expect(service.signIn('sam@example.com', 'Passw0rd1')).resolves.toBeDefined();
    });

    it('locks an unknown email the same way', async () => {
      await failFive('nobody@example.com');
      await expect(service.signIn('nobody@example.com', 'Passw0rd1')).rejects.toMatchObject({ status: 429 });
    });
  });
});
