import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { AdminGuard, INSECURE_ADMIN_HEADER_FLAG } from './admin.guard';

const ctxWithRole = (role?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: role ? { 'x-user-role': role } : {} }) }),
  }) as unknown as ExecutionContext;

afterEach(() => vi.unstubAllEnvs());

describe('AdminGuard', () => {
  it('lets an admin through when the development flag is on', () => {
    vi.stubEnv(INSECURE_ADMIN_HEADER_FLAG, 'true');
    expect(new AdminGuard().canActivate(ctxWithRole('admin'))).toBe(true);
  });

  it.each(['technician', 'Admin', undefined])('refuses role %s (AC10)', (role) => {
    vi.stubEnv(INSECURE_ADMIN_HEADER_FLAG, 'true');
    expect(() => new AdminGuard().canActivate(ctxWithRole(role))).toThrow(ForbiddenException);
  });

  it.each([undefined, '', 'false', '1'])('fails closed for an admin header when the flag is %s', (flag) => {
    vi.stubEnv(INSECURE_ADMIN_HEADER_FLAG, flag as string);
    expect(() => new AdminGuard().canActivate(ctxWithRole('admin'))).toThrow(ForbiddenException);
  });
});
