import { describe, expect, it } from 'vitest';
import { BadRequestException, UnauthorizedException } from '@nestjs/common';
import { ROLES } from './auth.constants';
import { AuthController, bearerToken } from './auth.controller';
import { AuthService } from './auth.service';
import { FakeAccountRepository } from './fake-account.repository';

// Test fixture only; not a real credential.
const VALID_PASSWORD = 'Passw0rd1';

function setup() {
  return new AuthController(new AuthService(new FakeAccountRepository(), () => new Date()));
}

describe('AuthController', () => {
  it('parses bearer headers', () => {
    expect(bearerToken('Bearer abc')).toBe('abc');
    expect(bearerToken('Basic abc')).toBeUndefined();
    expect(bearerToken(undefined)).toBeUndefined();
  });

  it('ignores a client-sent role (AC9) and reports exactly one known role (AC8)', async () => {
    const controller = setup();
    const res = await controller.register({ email: 'sam@example.com', password: VALID_PASSWORD, role: 'admin' } as never);
    expect(res.user.role).toBe('customer');
    expect(ROLES).toContain((await controller.session(`Bearer ${res.token}`)).role);
  });

  it('answers a bad sign-in with the 401 message (AC4)', async () => {
    const err = await setup().signIn({ email: 'a@example.com', password: VALID_PASSWORD }).catch((e) => e);
    expect(err).toBeInstanceOf(UnauthorizedException);
    expect(err.getResponse()).toMatchObject({ message: 'Email or password is incorrect' });
  });

  it('answers a duplicate registration with the generic message (AC15)', async () => {
    const controller = setup();
    const body = { email: 'sam@example.com', password: VALID_PASSWORD };
    await controller.register(body);
    const err = await controller.register(body).catch((e) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect(err.getResponse()).toEqual(expect.objectContaining({ message: 'Registration could not be completed' }));
  });

  it('signs out and then refuses the session (AC5)', async () => {
    const controller = setup();
    const { token } = await controller.register({ email: 'sam@example.com', password: VALID_PASSWORD });
    await controller.signOut(`Bearer ${token}`);
    await expect(controller.session(`Bearer ${token}`)).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
