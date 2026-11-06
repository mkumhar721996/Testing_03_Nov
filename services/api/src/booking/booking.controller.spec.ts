import { BadRequestException, ConflictException, ForbiddenException, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { CapacityService } from '../capacity/capacity.service';
import { FakeCapacityRepository } from '../capacity/fake-capacity.repository';
import { assertCustomer, identityFromHeaders } from '../capacity/identity';
import { VISIT_FEE, zoneLabel } from './booking.constants';
import { BookingController } from './booking.controller';
import { BookingService } from './booking.service';
import { FakeBookingRepository } from './fake-booking.repository';

const customer = { userId: 'c1', role: 'customer' } as const;
const day = '2026-11-09';
const window = '08:00-11:00';

function setup(withAddresses = true) {
  const capacity = new FakeCapacityRepository();
  const catalogue = new FakeBookingRepository({
    categories: [
      { id: 'heat', name: 'Heating and boilers' },
      { id: 'laundry', name: 'Laundry appliances' },
    ],
    services: [
      { id: 'boiler-service', categoryId: 'heat', name: 'Boiler service', note: 'Annual check' },
      { id: 'boiler-repair', categoryId: 'heat', name: 'Boiler repair', note: 'Repair' },
      { id: 'radiator', categoryId: 'heat', name: 'Radiator bleed', note: 'Cold spots' },
      { id: 'washer', categoryId: 'laundry', name: 'Washing machine repair', note: 'Faults' },
    ],
    addresses: withAddresses
      ? [
          { id: 'home', customerId: 'c1', label: 'Home', line: '22 Mill Lane, Leeds', timeZone: 'Europe/London' },
          { id: 'flat', customerId: 'c1', label: "Mum's flat", line: 'Calle Mayor 12, Madrid', timeZone: 'Europe/Madrid' },
          { id: 'other', customerId: 'c2', label: 'Home', line: '1 High St, York', timeZone: 'Europe/London' },
        ]
      : [{ id: 'other', customerId: 'c2', label: 'Home', line: '1 High St, York', timeZone: 'Europe/London' }],
  });
  const controller = new BookingController(new BookingService(catalogue, new CapacityService(capacity)));
  return { capacity, catalogue, controller };
}

describe('BookingController', () => {
  beforeEach(() => vi.stubEnv('ALLOW_INSECURE_HEADER_IDENTITY', 'true'));
  afterEach(() => vi.unstubAllEnvs());

  it('refuses a visitor with no identity and saves nothing (AC1)', () => {
    const { capacity } = setup();
    expect(() => identityFromHeaders(undefined, undefined)).toThrow(UnauthorizedException);
    expect(capacity.bookings).toHaveLength(0);
  });

  it('refuses an admin on the booking routes with 403 (AC1)', async () => {
    const { controller, capacity } = setup();
    const admin = { userId: 'a1', role: 'admin' } as const;
    expect(() => assertCustomer(admin)).toThrow(ForbiddenException);
    await expect(controller.book(admin, { serviceId: 'boiler-service', addressId: 'home', day, window })).rejects.toBeInstanceOf(ForbiddenException);
    expect(capacity.bookings).toHaveLength(0);
  });

  it('saves the booking to the caller whatever the body says (AC2)', async () => {
    const { controller, capacity } = setup();
    await capacity.setLimit(day, 3);
    const res = await controller.book(customer, {
      serviceId: 'boiler-service',
      addressId: 'home',
      day,
      window,
      customerId: 'someone-else',
    } as never);
    expect(capacity.bookings[0].customerId).toBe('c1');
    expect(capacity.bookings[0]).toMatchObject({
      serviceId: 'boiler-service',
      addressId: 'home',
      visitFee: 35,
      feeCurrency: 'GBP',
    });
    expect(res.bookingId).toBe(capacity.bookings[0].id);
  });

  it('offers only the services in the chosen category (AC3)', async () => {
    const { controller } = setup();
    expect((await controller.services(customer, 'heat')).map((s) => s.id)).toEqual([
      'boiler-service',
      'boiler-repair',
      'radiator',
    ]);
    await expect(controller.services(customer, 'nope')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('offers only the caller\'s own addresses (AC4)', async () => {
    const { controller, catalogue, capacity } = setup();
    expect((await controller.addresses(customer)).map((a) => a.id)).toEqual(['home', 'flat']);
    expect(await catalogue.getAddress('c1', 'other')).toBeNull();
    await capacity.setLimit(day, 3);
    await expect(
      controller.book(customer, { serviceId: 'boiler-service', addressId: 'other', day, window }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(capacity.bookings).toHaveLength(0);
  });

  it('marks every slot unavailable when the day is full (AC6)', async () => {
    const { controller, capacity } = setup();
    await capacity.setLimit(day, 1);
    await capacity.book(day, window, 'x');
    const res = await controller.slots(customer, day, 'home');
    expect(res.slots.every((s) => !s.bookable)).toBe(true);
    await expect(
      controller.book(customer, { serviceId: 'boiler-service', addressId: 'home', day, window }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('confirms straight away with no approval step (AC7, AC9)', async () => {
    const { controller, capacity } = setup();
    await capacity.setLimit(day, 3);
    const res = await controller.book(customer, { serviceId: 'boiler-service', addressId: 'home', day, window });
    expect(res).toMatchObject({ status: 'confirmed', visitFee: { amount: 35, currency: 'GBP' } });
    expect(capacity.bookings[0].status).toBe('confirmed');
  });

  it('returns the fixed visit fee with the categories (AC8)', async () => {
    const { controller } = setup();
    expect((await controller.categories(customer)).visitFee).toEqual(VISIT_FEE);
    expect(VISIT_FEE).toEqual({ amount: 35, currency: 'GBP' });
  });

  it('asks for an address and creates no booking when there is none (AC10, AC11)', async () => {
    const { controller, capacity } = setup(false);
    await capacity.setLimit(day, 3);
    const attempt = controller.book(customer, { serviceId: 'boiler-service', day, window });
    await expect(attempt).rejects.toBeInstanceOf(BadRequestException);
    await expect(attempt).rejects.toThrow('Add an address before you book.');
    expect(capacity.bookings).toHaveLength(0);
  });

  it('shows slot times in the address time zone (AC12)', async () => {
    const { controller } = setup();
    expect(zoneLabel('2026-11-09', 'Europe/London')).toBe('GMT');
    expect(zoneLabel('2026-11-09', 'Europe/Madrid')).toBe('CET');
    const res = await controller.slots(customer, day, 'flat');
    expect(res).toMatchObject({ day, timeZone: 'Europe/Madrid', zoneLabel: 'CET' });
    await expect(controller.slots(customer, day, 'other')).rejects.toBeInstanceOf(NotFoundException);
  });

  it('rejects an unknown service (AC2)', async () => {
    const { controller, capacity } = setup();
    await expect(
      controller.book(customer, { serviceId: 'nope', addressId: 'home', day, window }),
    ).rejects.toBeInstanceOf(NotFoundException);
    expect(capacity.bookings).toHaveLength(0);
  });
});
