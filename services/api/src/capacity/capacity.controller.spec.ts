import { BadRequestException, ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacityController } from './capacity.controller';
import { CapacityService } from './capacity.service';
import { FakeCapacityRepository } from './fake-capacity.repository';
import { assertAdmin, identityFromHeaders } from './identity';

const admin = { userId: 'a1', role: 'admin' } as const;
const customer = { userId: 'c1', role: 'customer' } as const;
const day = '2026-11-09';

function setup() {
  const repo = new FakeCapacityRepository();
  return { repo, controller: new CapacityController(new CapacityService(repo), repo) };
}

describe('CapacityController', () => {
  it('sets a limit and returns the day (AC1)', async () => {
    const { controller } = setup();
    expect(await controller.setLimit(admin, day, { limit: 7 })).toEqual({
      day,
      limit: 7,
      booked: 0,
      placesLeft: 7,
    });
  });

  it('rejects out-of-range or fractional limits (AC1)', async () => {
    const { controller } = setup();
    for (const limit of [-1, 2.5, 201]) {
      await expect(controller.setLimit(admin, day, { limit })).rejects.toBeInstanceOf(BadRequestException);
    }
  });

  it('answers 409 for every window on a full day (AC3)', async () => {
    const { controller, repo } = setup();
    await repo.setLimit(day, 1);
    await repo.book(day, '08:00-11:00', 'x');
    for (const window of ['08:00-11:00', '11:00-14:00', '14:00-17:00']) {
      await expect(controller.book(customer, { day, window })).rejects.toBeInstanceOf(ConflictException);
    }
  });

  it('refuses a customer changing a limit (AC7)', async () => {
    const { controller, repo } = setup();
    await expect(controller.setLimit(customer, day, { limit: 9 })).rejects.toBeInstanceOf(ForbiddenException);
    expect((await repo.getDay(day)).limit).toBeNull();
  });

  it('lists days for an admin only', async () => {
    const { controller } = setup();
    await controller.setLimit(admin, day, { limit: 2 });
    const rows = await controller.list(admin, day, '2');
    expect(rows.map((r) => r.day)).toEqual(['2026-11-09', '2026-11-10']);
    await expect(controller.list(customer, day, '2')).rejects.toBeInstanceOf(ForbiddenException);
  });
});

describe('identity', () => {
  beforeEach(() => vi.stubEnv('ALLOW_INSECURE_HEADER_IDENTITY', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  it('refuses header identity unless explicitly enabled, so a forged admin header fails', () => {
    vi.stubEnv('ALLOW_INSECURE_HEADER_IDENTITY', '');
    expect(() => identityFromHeaders('x', 'admin')).toThrow(UnauthorizedException);
    vi.stubEnv('ALLOW_INSECURE_HEADER_IDENTITY', 'false');
    expect(() => identityFromHeaders('x', 'admin')).toThrow(UnauthorizedException);
  });
  it('rejects missing or unknown identity with 401', () => {
    expect(() => identityFromHeaders(undefined, undefined)).toThrow(UnauthorizedException);
    expect(() => identityFromHeaders('u', 'root')).toThrow(UnauthorizedException);
  });
  it('asserts admin with 403', () => {
    expect(() => assertAdmin(customer)).toThrow(ForbiddenException);
    expect(() => assertAdmin(identityFromHeaders('a', 'admin'))).not.toThrow();
  });
});
