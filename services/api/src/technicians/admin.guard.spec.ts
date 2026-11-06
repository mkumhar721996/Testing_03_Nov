import type { ExecutionContext } from '@nestjs/common';
import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { AdminGuard } from './admin.guard';

const ctxWithRole = (role?: string) =>
  ({
    switchToHttp: () => ({ getRequest: () => ({ headers: role ? { 'x-user-role': role } : {} }) }),
  }) as unknown as ExecutionContext;

describe('AdminGuard', () => {
  it('lets an admin through', () => {
    expect(new AdminGuard().canActivate(ctxWithRole('admin'))).toBe(true);
  });

  it.each(['technician', undefined])('refuses role %s (AC10)', (role) => {
    expect(() => new AdminGuard().canActivate(ctxWithRole(role))).toThrow(ForbiddenException);
  });
});
