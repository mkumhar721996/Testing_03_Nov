import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { beforeEach, describe, expect, it } from 'vitest';
import { CapacityService } from './capacity.service';
import { FakeCapacityRepository } from './fake-capacity.repository';
import type { Identity } from './identity';

const admin: Identity = { userId: 'a1', role: 'admin' };
const customer: Identity = { userId: 'c1', role: 'customer' };
const day = '2026-11-09';

describe('CapacityService', () => {
  let repo: FakeCapacityRepository;
  let service: CapacityService;

  beforeEach(() => {
    repo = new FakeCapacityRepository();
    service = new CapacityService(repo);
  });

  async function fill(d: string, limit: number, bookings: number) {
    await repo.setLimit(d, limit);
    for (let i = 0; i < bookings; i++) await repo.book(d, '08:00-11:00', `u${i}`);
  }

  it('shows the new visit limit after an admin sets it (AC1)', async () => {
    await service.setLimit(admin, day, 7);
    expect((await service.slotsFor(day)).limit).toBe(7);
  });

  it('rejects limits that are not whole numbers from 0 to 200, and bad days', async () => {
    for (const bad of [-1, 2.5, 201, Number.NaN, '5' as unknown as number]) {
      await expect(service.setLimit(admin, day, bad)).rejects.toBeInstanceOf(BadRequestException);
    }
    await expect(service.setLimit(admin, '2026-02-30', 5)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('offers no bookable slot on a full day (AC2)', async () => {
    await fill(day, 2, 2);
    const r = await service.slotsFor(day);
    expect(r.slots.every((s) => !s.bookable)).toBe(true);
    expect(r.placesLeft).toBe(0);
  });

  it('refuses a booking on a full day (AC3)', async () => {
    await fill(day, 2, 2);
    await expect(service.book(customer, day, '08:00-11:00')).rejects.toBeInstanceOf(ConflictException);
    expect(repo.bookings).toHaveLength(2);
  });

  it('confirms a booking with one place left (AC5)', async () => {
    await fill(day, 5, 4);
    await expect(service.book(customer, day, '11:00-14:00')).resolves.toEqual({
      bookingId: expect.any(String),
    });
    expect((await repo.getDay(day)).booked).toBe(5);
  });

  it('rejects an unknown window', async () => {
    await fill(day, 5, 0);
    await expect(service.book(customer, day, '09:00-10:00')).rejects.toBeInstanceOf(BadRequestException);
  });

  it('offers the same three windows on different days (AC6)', async () => {
    for (const d of ['2026-11-09', '2026-11-10']) {
      await service.setLimit(admin, d, 3);
      expect((await service.slotsFor(d)).slots.map((s) => s.window)).toEqual([
        '08:00-11:00',
        '11:00-14:00',
        '14:00-17:00',
      ]);
    }
  });

  it('refuses a customer setting a limit (AC7)', async () => {
    await expect(service.setLimit(customer, day, 9)).rejects.toBeInstanceOf(ForbiddenException);
    expect((await repo.getDay(day)).limit).toBeNull();
  });

  it('closes a day with no limit set (AC8)', async () => {
    const r = await service.slotsFor(day);
    expect(r.limit).toBeNull();
    expect(r.slots.every((s) => !s.bookable)).toBe(true);
    await expect(service.book(customer, day, '08:00-11:00')).rejects.toBeInstanceOf(ConflictException);
  });

  it('keeps existing bookings confirmed when the limit is lowered (AC9)', async () => {
    await fill(day, 5, 5);
    await service.setLimit(admin, day, 3);
    const bookings = await service.bookingsFor(admin, day);
    expect(bookings).toHaveLength(5);
    expect(bookings.every((b) => b.status === 'confirmed')).toBe(true);
  });

  it('refuses a booking when the limit is lowered below the bookings (AC10)', async () => {
    await fill(day, 5, 5);
    await service.setLimit(admin, day, 3);
    await expect(service.book(customer, day, '08:00-11:00')).rejects.toBeInstanceOf(ConflictException);
    expect((await service.slotsFor(day)).placesLeft).toBe(0);
  });
});
