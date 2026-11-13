import { ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { ROLES, SESSION_COOKIE, SESSION_TTL_MS } from './auth.constants';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { FakeAccountRepository } from './fake-account.repository';
import { readCookie, setCookieOptions } from './session.cookie';

const XRW = 'bounteous-web';
const body = { email: 'sam@example.com', password: 'Passw0rd1' };

describe('AuthController', () => {
  let controller: AuthController;
  let res: { cookie: ReturnType<typeof vi.fn>; clearCookie: ReturnType<typeof vi.fn> };

  const tokenSet = () => res.cookie.mock.calls[0][1] as string;

  beforeEach(() => {
    controller = new AuthController(new AuthService(new FakeAccountRepository(), () => new Date()));
    res = { cookie: vi.fn(), clearCookie: vi.fn() };
  });

  it('registers, sets an httpOnly cookie and puts no token in the body (AC1)', async () => {
    const user = await controller.register(body, XRW, res);
    expect(res.cookie).toHaveBeenCalledWith(
      SESSION_COOKIE,
      expect.any(String),
      expect.objectContaining({ httpOnly: true, maxAge: SESSION_TTL_MS }),
    );
    expect(user).not.toHaveProperty('token');
    expect(user.email).toBe('sam@example.com');
  });

  it('ignores a client-sent role (AC8)', async () => {
    const user = await controller.register({ ...body, role: 'admin' } as never, XRW, res);
    expect(user.role).toBe('customer');
  });

  it('answers a duplicate with the generic message (AC11)', async () => {
    await controller.register(body, XRW, res);
    const err = await controller.register(body, XRW, res).catch((e) => e);
    expect(err.getResponse()).toEqual(expect.objectContaining({ message: 'Registration could not be completed' }));
  });

  it('answers a failed sign-in with the generic message (AC12)', async () => {
    const err = await controller.signIn(body, XRW, res).catch((e) => e);
    expect(err.getResponse()).toMatchObject({ message: 'Email or password is incorrect' });
  });

  it('reports a signed-in role that is one of the three (AC7)', async () => {
    await controller.register(body, XRW, res);
    const session = await controller.session(`other=1; ${SESSION_COOKIE}=${tokenSet()}`);
    expect(ROLES).toContain(session.role);
  });

  it('signs in, then sign-out clears the cookie and ends the session (AC4)', async () => {
    await controller.register(body, XRW, res);
    const token = tokenSet();
    await controller.signOut(XRW, `${SESSION_COOKIE}=${token}`, res);
    expect(res.clearCookie).toHaveBeenCalledWith(SESSION_COOKIE, expect.any(Object));
    await expect(controller.session(`${SESSION_COOKIE}=${token}`)).rejects.toMatchObject({ status: 401 });
  });

  it('requires the x-requested-with header on state-changing routes', async () => {
    await expect(controller.signIn(body, undefined, res)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.register(body, undefined, res)).rejects.toBeInstanceOf(ForbiddenException);
    await expect(controller.signOut(undefined, undefined, res)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('sets cross-site cookie flags only in production', () => {
    expect(setCookieOptions('production')).toMatchObject({ secure: true, sameSite: 'none', httpOnly: true });
    expect(setCookieOptions('development')).toMatchObject({ sameSite: 'lax', httpOnly: true });
  });

  it('reads a named cookie', () => {
    expect(readCookie('a=1; session=abc%3D', 'session')).toBe('abc=');
    expect(readCookie(undefined, 'session')).toBeUndefined();
    expect(readCookie('a=1', 'session')).toBeUndefined();
  });
});
