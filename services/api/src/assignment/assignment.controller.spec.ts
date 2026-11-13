import { randomUUID } from 'node:crypto';
import {
  BadRequestException,
  ConflictException,
  NotFoundException,
  type INestApplication,
} from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { INSECURE_ADMIN_HEADER_FLAG } from '../technicians/admin.guard';
import type { TechnicianProfile } from '../technicians/technician.model';
import { TECHNICIAN_REPOSITORY, type TechnicianRepository } from '../technicians/technician.repository';
import type { AssignableBooking } from './assignment.model';
import { AssignmentController } from './assignment.controller';
import { ASSIGNMENT_REPOSITORY } from './assignment.repository';
import { FakeAssignmentRepository } from './fake-assignment.repository';

const DAY = '2026-11-09'; // a Monday

function profile(name: string, active = true): TechnicianProfile {
  return {
    id: randomUUID(),
    name,
    loginEmail: `${name}@x.example`,
    phone: null,
    serviceArea: null,
    notes: null,
    active,
    workingHours: [{ weekday: 1, start: '08:00', end: '16:00' }],
    daysOff: [],
  };
}

function setup() {
  const techs = new Map<string, TechnicianProfile>();
  const techRepo = {
    listAssignable: async () => [...techs.values()].filter((t) => t.active),
    get: async (id: string) => techs.get(id) ?? null,
  } as unknown as TechnicianRepository;
  const repo = new FakeAssignmentRepository();
  const controller = new AssignmentController(repo, techRepo);
  const tech = (name: string, active = true) => {
    const t = profile(name, active);
    techs.set(t.id, t);
    return t;
  };
  const booking = (over: Partial<AssignableBooking> = {}) => {
    const b: AssignableBooking = {
      id: randomUUID(),
      customerId: 'c1',
      day: DAY,
      window: '08:00-11:00',
      status: 'confirmed',
      technicianId: null,
      ...over,
    };
    repo.bookings.push(b);
    return b;
  };
  return { repo, techRepo, techs, controller, tech, booking };
}

describe('AssignmentController', () => {
  it('lists an unassigned booking and not an assigned one (AC1, AC2)', async () => {
    const { controller, tech, booking } = setup();
    const a = booking();
    const b = booking({ technicianId: tech('Priya').id });
    const ids = (await controller.list('unassigned')).map((x) => x.id);
    expect(ids).toEqual([a.id]);
    expect((await controller.list('assigned')).map((x) => x.id)).toEqual([b.id]);
    expect(() => controller.list('nonsense')).toThrow(BadRequestException);
  });

  it('assigns an active technician (AC3)', async () => {
    const { controller, repo, tech, booking } = setup();
    const t = tech('Priya');
    const b = booking();
    const res = await controller.assign(b.id, { technicianId: t.id });
    expect(res.booking.technicianId).toBe(t.id);
    expect((await repo.getBooking(b.id))?.technicianId).toBe(t.id);
  });

  it('refuses an inactive, unknown or malformed technician and leaves the booking (AC3)', async () => {
    const { controller, repo, tech, booking } = setup();
    const inactive = tech('Elena', false);
    const b = booking();
    for (const technicianId of [inactive.id, randomUUID(), 'nope', undefined]) {
      await expect(controller.assign(b.id, { technicianId })).rejects.toBeInstanceOf(BadRequestException);
    }
    expect((await repo.getBooking(b.id))?.technicianId).toBeNull();
  });

  it('answers 404 for an unknown booking', async () => {
    const { controller, tech } = setup();
    await expect(controller.assign(randomUUID(), { technicianId: tech('A').id })).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('reassigns to a different technician (AC4)', async () => {
    const { controller, tech, booking } = setup();
    const a = tech('Marcus');
    const c = tech('Priya');
    const b = booking({ technicianId: a.id });
    const res = await controller.assign(b.id, { technicianId: c.id });
    expect(res.booking.technicianId).toBe(c.id);
  });

  it('refuses the same technician and leaves the booking unchanged (AC4)', async () => {
    const { controller, repo, tech, booking } = setup();
    const a = tech('Marcus');
    const b = booking({ technicianId: a.id });
    await expect(controller.assign(b.id, { technicianId: a.id })).rejects.toBeInstanceOf(BadRequestException);
    expect((await repo.getBooking(b.id))?.technicianId).toBe(a.id);
  });

  it("shows each technician's hours, days off and jobs on the booking's day (AC5)", async () => {
    const { controller, techs, tech, booking } = setup();
    const t = tech('Priya');
    techs.get(t.id)!.daysOff = [DAY];
    const other = booking({ technicianId: t.id });
    const b = booking();
    tech('Elena', false);
    const options = await controller.options(b.id);
    expect(options).toHaveLength(1);
    const [opt] = options;
    expect(opt).toMatchObject({ workingHours: { start: '08:00', end: '16:00' }, daysOff: [DAY], jobsOnDay: [{ id: other.id }] });
    expect(opt.jobsOnDay.map((j) => j.id)).not.toContain(b.id);
  });

  it('reports no working hours on a day the technician does not work (AC5)', async () => {
    const { controller, tech, booking } = setup();
    tech('Priya');
    const b = booking({ day: '2026-11-08' }); // a Sunday
    expect((await controller.options(b.id))[0].workingHours).toBeNull();
  });

  it('assigns a technician who is off that day (AC6)', async () => {
    const { controller, techs, tech, booking } = setup();
    const t = tech('Priya');
    const b = booking();
    techs.get(t.id)!.daysOff = [b.day];
    expect((await controller.assign(b.id, { technicianId: t.id })).booking.technicianId).toBe(t.id);
  });

  it('assigns a technician who already holds a job that day (AC7)', async () => {
    const { controller, repo, tech, booking } = setup();
    const t = tech('Priya');
    booking({ technicianId: t.id });
    const b = booking();
    const res = await controller.assign(b.id, { technicianId: t.id });
    expect(res.booking.technicianId).toBe(t.id);
    expect((await repo.bookingsHeldOn(t.id, b.day, b.id)).length).toBe(1);
  });

  it('notifies the technician of a new assignment (AC8)', async () => {
    const { controller, tech, booking } = setup();
    const t = tech('Priya');
    const b = booking();
    const res = await controller.assign(b.id, { technicianId: t.id });
    expect(res.notified).toEqual([{ technicianId: t.id, bookingId: b.id, kind: 'assigned' }]);
  });

  it('notifies the new technician and tells the previous one (AC9, AC13)', async () => {
    const { controller, tech, booking } = setup();
    const a = tech('Marcus');
    const c = tech('Priya');
    const b = booking({ technicianId: a.id });
    const res = await controller.assign(b.id, { technicianId: c.id });
    expect(res.notified).toContainEqual({ technicianId: c.id, bookingId: b.id, kind: 'assigned' });
    expect(res.notified).toContainEqual({ technicianId: a.id, bookingId: b.id, kind: 'removed' });
  });

  it.each(['on_the_way', 'in_progress', 'completed'])('refuses reassigning a %s booking (AC11, AC12)', async (status) => {
    const { controller, repo, tech, booking } = setup();
    const a = tech('Marcus');
    const c = tech('Priya');
    const b = booking({ technicianId: a.id, status });
    const err = await controller.assign(b.id, { technicianId: c.id }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(ConflictException);
    expect((err as ConflictException).getResponse()).toMatchObject({ booking: { technicianId: a.id } });
    expect((await repo.getBooking(b.id))?.technicianId).toBe(a.id);
    expect(repo.notifications).toEqual([]);
  });
});

describe('AssignmentController admin guard (AC10)', () => {
  let app: INestApplication;
  let base: string;
  let ctx: ReturnType<typeof setup>;

  beforeEach(async () => {
    vi.stubEnv(INSECURE_ADMIN_HEADER_FLAG, 'true');
    ctx = setup();
    const moduleRef = await Test.createTestingModule({
      controllers: [AssignmentController],
      providers: [
        { provide: ASSIGNMENT_REPOSITORY, useValue: ctx.repo },
        { provide: TECHNICIAN_REPOSITORY, useValue: ctx.techRepo },
        (await import('../technicians/admin.guard')).AdminGuard,
      ],
    }).compile();
    app = moduleRef.createNestApplication();
    await app.listen(0);
    base = await app.getUrl();
  });
  afterEach(async () => {
    await app.close();
    vi.unstubAllEnvs();
  });

  const call = (method: string, path: string, role?: string, body?: unknown) =>
    fetch(`${base.replace('[::1]', 'localhost')}${path}`, {
      method,
      headers: { 'content-type': 'application/json', ...(role ? { 'x-user-role': role } : {}) },
      body: body === undefined ? undefined : JSON.stringify(body),
    });

  it.each(['technician', undefined])('refuses assign and reassign for role %s and changes nothing', async (role) => {
    const t = ctx.tech('Priya');
    const held = ctx.tech('Marcus');
    const fresh = ctx.booking();
    const owned = ctx.booking({ technicianId: held.id });
    expect((await call('POST', `/bookings/${fresh.id}/technician`, role, { technicianId: t.id })).status).toBe(403);
    expect((await call('POST', `/bookings/${owned.id}/technician`, role, { technicianId: t.id })).status).toBe(403);
    expect((await ctx.repo.getBooking(fresh.id))?.technicianId).toBeNull();
    expect((await ctx.repo.getBooking(owned.id))?.technicianId).toBe(held.id);
    expect((await call('GET', '/bookings?assignment=unassigned', role)).status).toBe(403);
    expect((await call('GET', `/bookings/${fresh.id}/technician-options`, role)).status).toBe(403);
  });

  it('refuses everyone when the development flag is unset', async () => {
    vi.stubEnv(INSECURE_ADMIN_HEADER_FLAG, '');
    const t = ctx.tech('Priya');
    const b = ctx.booking();
    expect((await call('POST', `/bookings/${b.id}/technician`, 'admin', { technicianId: t.id })).status).toBe(403);
    expect((await ctx.repo.getBooking(b.id))?.technicianId).toBeNull();
  });

  it('lets an admin assign and answers 409 for a locked booking', async () => {
    const t = ctx.tech('Priya');
    const held = ctx.tech('Marcus');
    const b = ctx.booking();
    const locked = ctx.booking({ technicianId: held.id, status: 'completed' });
    expect((await call('POST', `/bookings/${b.id}/technician`, 'admin', { technicianId: t.id })).status).toBe(200);
    expect((await call('POST', `/bookings/${locked.id}/technician`, 'admin', { technicianId: t.id })).status).toBe(409);
  });
});
