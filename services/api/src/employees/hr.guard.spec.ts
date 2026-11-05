import { ForbiddenException, UnauthorizedException, type ExecutionContext } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { HrGuard } from './hr.guard';

const ctx = (principal?: unknown) =>
  ({ switchToHttp: () => ({ getRequest: () => ({ principal }) }) }) as unknown as ExecutionContext;

describe('HrGuard', () => {
  it('rejects a request without a principal with 401', () => {
    expect(() => new HrGuard().canActivate(ctx())).toThrow(UnauthorizedException);
  });

  it('rejects a principal without the HR role with 403', () => {
    expect(() => new HrGuard().canActivate(ctx({ userId: 'u', tenantId: 't', roles: ['Manager'] }))).toThrow(
      ForbiddenException,
    );
  });

  it('allows HR', () => {
    expect(new HrGuard().canActivate(ctx({ userId: 'u', tenantId: 't', roles: ['HR'] }))).toBe(true);
  });
});
