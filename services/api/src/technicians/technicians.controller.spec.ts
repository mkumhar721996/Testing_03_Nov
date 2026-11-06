import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, ForbiddenException, NotFoundException } from '@nestjs/common';
import { Test } from '@nestjs/testing';
import { describe, expect, it, vi } from 'vitest';
import { AdminGuard } from './admin.guard';
import type { Job, NewTechnician, Technician, WorkingDay } from './technician.model';
import { DuplicateEmailError, TECHNICIAN_REPOSITORY, type TechnicianRepository } from './technician.repository';
import { TechniciansController } from './technicians.controller';

function fakeRepo(jobs: Job[] = []) {
  const techs = new Map<string, Technician>();
  const hours = new Map<string, WorkingDay[]>();
  const off = new Map<string, Set<string>>();
  const jobList = [...jobs];
  const repo = {
    create: vi.fn(async (t: NewTechnician) => {
      if ([...techs.values()].some((x) => x.loginEmail.toLowerCase() === t.loginEmail.toLowerCase())) {
        throw new DuplicateEmailError();
      }
      const tech: Technician = {
        id: randomUUID(),
        name: t.name,
        loginEmail: t.loginEmail,
        phone: t.phone ?? null,
        serviceArea: t.serviceArea ?? null,
        notes: t.notes ?? null,
        active: true,
      };
      techs.set(tech.id, tech);
      return tech;
    }),
    list: vi.fn(async (f?: { active?: boolean }) =>
      [...techs.values()]
        .filter((t) => f?.active === undefined || t.active === f.active)
        .map((t) => ({ ...t, workingDays: [], openJobCount: 0, nextDayOff: null })),
    ),
    get: vi.fn(async (id: string) => {
      const t = techs.get(id);
      return t ? { ...t, workingHours: hours.get(id) ?? [], daysOff: [...(off.get(id) ?? [])].sort() } : null;
    }),
    updateProfile: vi.fn(async (id: string, p: Partial<Technician>) => {
      const t = techs.get(id);
      if (!t) return null;
      Object.assign(t, p);
      return t;
    }),
    replaceWeeklyHours: vi.fn(async (id: string, days: WorkingDay[]) => void hours.set(id, days)),
    addDayOff: vi.fn(async (id: string, day: string) => void off.set(id, (off.get(id) ?? new Set()).add(day))),
    removeDayOff: vi.fn(async (id: string, day: string) => void off.get(id)?.delete(day)),
    setActive: vi.fn(async (id: string, active: boolean) => {
      const t = techs.get(id);
      if (!t) return null;
      t.active = active;
      return t;
    }),
    listAssignable: vi.fn(async () => [...techs.values()].filter((t) => t.active)),
    jobsHeldBy: vi.fn(async (id: string, onDate?: string) =>
      jobList.filter((j) => j.technicianId === id && (onDate === undefined || j.scheduledDate === onDate)),
    ),
    reassignJob: vi.fn(async (jobId: string, technicianId: string) => {
      const j = jobList.find((x) => x.id === jobId);
      if (!j) return null;
      j.technicianId = technicianId;
      return j;
    }),
  };
  return repo satisfies TechnicianRepository;
}

const job = (id: string, technicianId: string, date: string, status = 'open'): Job => ({
  id,
  title: id,
  customer: 'c',
  scheduledDate: date,
  scheduledTime: null,
  technicianId,
  status,
});

async function setup(jobs: Job[] = []) {
  const repo = fakeRepo(jobs);
  const controller = new TechniciansController(repo);
  const t = await controller.create({ name: 'Priya Nair', loginEmail: 'priya@x.example' });
  return { repo, controller, id: t.id };
}

describe('TechniciansController', () => {
  it('creates an active technician that the list contains (AC1, AC13)', async () => {
    const { controller, id } = await setup();
    expect((await controller.list()).map((t) => t.id)).toContain(id);
    expect((await controller.get(id)).active).toBe(true);
  });

  it.each([
    [{ name: ' ', loginEmail: 'a@x.example' }, 'name'],
    [{ name: 'A', loginEmail: '' }, 'loginEmail'],
  ])('refuses a blank required field and saves nothing (AC14)', async (body, field) => {
    const repo = fakeRepo();
    const err = await new TechniciansController(repo).create(body).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toMatchObject({ errors: { [field]: expect.any(String) } });
    expect(repo.create).not.toHaveBeenCalled();
  });

  it('answers 409 for a duplicate login email', async () => {
    const { controller } = await setup();
    await expect(controller.create({ name: 'B', loginEmail: 'PRIYA@x.example' })).rejects.toBeInstanceOf(
      ConflictException,
    );
  });

  it('shows saved profile details (AC2)', async () => {
    const { controller, id } = await setup();
    await controller.update(id, { phone: '555-0101', serviceArea: 'North' });
    expect(await controller.get(id)).toMatchObject({ phone: '555-0101', serviceArea: 'North' });
  });

  it('refuses a blank name on edit', async () => {
    const { controller, id } = await setup();
    await expect(controller.update(id, { name: ' ' })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('shows saved weekly hours (AC3)', async () => {
    const { controller, id } = await setup();
    await controller.putHours(id, { days: [{ weekday: 1, start: '08:00', end: '16:00' }] });
    expect((await controller.get(id)).workingHours).toEqual([{ weekday: 1, start: '08:00', end: '16:00' }]);
  });

  it('refuses end not after start and keeps the saved schedule (AC15)', async () => {
    const { controller, repo, id } = await setup();
    const saved = [{ weekday: 1, start: '08:00', end: '16:00' }];
    await controller.putHours(id, { days: saved });
    repo.replaceWeeklyHours.mockClear();
    const err = await controller.putHours(id, { days: [{ weekday: 1, start: '17:00', end: '09:00' }] }).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getResponse()).toMatchObject({ errors: { 1: expect.any(String) } });
    expect(repo.replaceWeeklyHours).not.toHaveBeenCalled();
    expect((await controller.get(id)).workingHours).toEqual(saved);
  });

  it('shows a day off (AC4) and can remove it', async () => {
    const { controller, id } = await setup();
    await controller.addDayOff(id, { date: '2026-11-12' });
    expect((await controller.get(id)).daysOff).toContain('2026-11-12');
    await controller.removeDayOff(id, '2026-11-12');
    expect((await controller.get(id)).daysOff).toEqual([]);
  });

  it.each(['tomorrow', '2026-02-30', ''])('refuses day off date %s and saves nothing', async (date) => {
    const { controller, repo, id } = await setup();
    await expect(controller.addDayOff(id, { date })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.addDayOff).not.toHaveBeenCalled();
  });

  it('refuses removing an impossible date', async () => {
    const { controller, repo, id } = await setup();
    await expect(controller.removeDayOff(id, '2026-02-30')).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.removeDayOff).not.toHaveBeenCalled();
  });

  it('marking the same day off twice is harmless', async () => {
    const { controller, id } = await setup();
    await controller.addDayOff(id, { date: '2026-11-12' });
    await controller.addDayOff(id, { date: '2026-11-12' });
    expect((await controller.get(id)).daysOff).toEqual(['2026-11-12']);
  });

  it('answers 404 when marking a day off for an unknown technician', async () => {
    const { controller, repo } = await setup();
    await expect(controller.addDayOff(randomUUID(), { date: '2026-11-12' })).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.addDayOff).not.toHaveBeenCalled();
  });

  it('refuses duplicate weekdays in the schedule and saves nothing', async () => {
    const { controller, repo, id } = await setup();
    const day = { weekday: 1, start: '08:00', end: '16:00' };
    await expect(controller.putHours(id, { days: [day, day] })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.replaceWeeklyHours).not.toHaveBeenCalled();
  });

  it('answers 404 when saving hours for an unknown technician', async () => {
    const { controller } = await setup();
    await expect(controller.putHours(randomUUID(), { days: [] })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('can clear the schedule with an empty list', async () => {
    const { controller, id } = await setup();
    await controller.putHours(id, { days: [{ weekday: 1, start: '08:00', end: '16:00' }] });
    await controller.putHours(id, { days: [] });
    expect((await controller.get(id)).workingHours).toEqual([]);
  });

  it('filters the list by status', async () => {
    const { controller, id } = await setup();
    await controller.create({ name: 'Q', loginEmail: 'q@x.example' });
    await controller.deactivate(id);
    expect((await controller.list('inactive')).map((t) => t.id)).toEqual([id]);
    expect((await controller.list('active')).map((t) => t.id)).not.toContain(id);
    expect(await controller.list()).toHaveLength(2);
  });

  it('clears an optional profile field when sent blank', async () => {
    const { controller, id } = await setup();
    await controller.update(id, { phone: '555-0101' });
    await controller.update(id, { phone: '  ' });
    expect((await controller.get(id)).phone).toBeNull();
  });

  it('reassign refuses a missing or non-uuid technician id', async () => {
    const { controller, repo } = await setup([job('job-1', 'old', '2026-11-12')]);
    await expect(controller.reassign('job-1', {})).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.reassign('job-1', { technicianId: 'nope' })).rejects.toBeInstanceOf(BadRequestException);
    expect(repo.reassignJob).not.toHaveBeenCalled();
  });

  it('reassign answers 404 for an unknown job', async () => {
    const { controller, id } = await setup();
    await expect(controller.reassign('missing', { technicianId: id })).rejects.toBeInstanceOf(NotFoundException);
  });

  it('answers 404 when the technician does not exist', async () => {
    const { controller } = await setup();
    await expect(controller.get(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.update(randomUUID(), { phone: '1' })).rejects.toBeInstanceOf(NotFoundException);
    await expect(controller.activate(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('deactivates and activates (AC5, AC6)', async () => {
    const { controller, id } = await setup();
    expect((await controller.deactivate(id)).technician.active).toBe(false);
    expect((await controller.activate(id)).active).toBe(true);
  });

  it('answers 404 for an unknown technician', async () => {
    const { controller } = await setup();
    await expect(controller.deactivate(randomUUID())).rejects.toBeInstanceOf(NotFoundException);
  });

  it('returns every open job on deactivation and leaves jobs untouched (AC7, AC9)', async () => {
    const repo = fakeRepo();
    const controller = new TechniciansController(repo);
    const { id } = await controller.create({ name: 'P', loginEmail: 'p@x.example' });
    repo.jobsHeldBy.mockResolvedValue([
      job('job-1', id, '2026-11-12'),
      job('job-2', id, '2026-11-13'),
      job('job-3', id, '2026-11-12', 'completed'),
    ]);
    repo.reassignJob.mockClear();
    const res = await controller.deactivate(id);
    expect(res.jobsNeedingReassignment.map((j) => j.id)).toEqual(['job-1', 'job-2']);
    expect(res.jobsNeedingReassignment.every((j) => j.technicianId === id)).toBe(true);
    expect(repo.reassignJob).not.toHaveBeenCalled();
  });

  it('lists only the open jobs a technician holds (AC7)', async () => {
    const repo = fakeRepo();
    const controller = new TechniciansController(repo);
    const { id } = await controller.create({ name: 'P', loginEmail: 'p@x.example' });
    repo.jobsHeldBy.mockResolvedValue([job('job-1', id, '2026-11-12'), job('job-2', id, '2026-11-12', 'cancelled')]);
    expect((await controller.openJobs(id)).map((j) => j.id)).toEqual(['job-1']);
  });

  it('offers only active technicians as assignable (AC8)', async () => {
    const { controller, id } = await setup();
    await controller.deactivate(id);
    expect((await controller.assignable()).some((t) => t.id === id)).toBe(false);
  });

  it('refuses to reassign a job to an inactive technician (AC8)', async () => {
    const { controller, id } = await setup();
    await controller.deactivate(id);
    await expect(controller.reassign('job-1', { technicianId: id })).rejects.toBeInstanceOf(BadRequestException);
  });

  it('reassigns a job to an active technician', async () => {
    const { controller, repo } = await setup([job('job-1', 'old', '2026-11-12')]);
    const other = await controller.create({ name: 'Q', loginEmail: 'q@x.example' });
    expect((await controller.reassign('job-1', { technicianId: other.id })).technicianId).toBe(other.id);
    expect(repo.reassignJob).toHaveBeenCalledOnce();
  });

  it('returns the job on the marked day (AC11)', async () => {
    const repo = fakeRepo();
    const controller = new TechniciansController(repo);
    const { id } = await controller.create({ name: 'P', loginEmail: 'p@x.example' });
    repo.jobsHeldBy.mockImplementation(async (_id, d) =>
      [job('job-1', id, '2026-11-12'), job('job-2', id, '2026-11-12', 'completed')].filter(
        (j) => d === undefined || j.scheduledDate === d,
      ),
    );
    const res = await controller.addDayOff(id, { date: '2026-11-12' });
    expect(res.jobsNeedingReassignment.map((j) => j.id)).toEqual(['job-1']);
  });

  it('returns no jobs when the day off is another day (AC12)', async () => {
    const { controller, id } = await setup([]);
    const res = await controller.addDayOff(id, { date: '2026-11-13' });
    expect(res.jobsNeedingReassignment).toEqual([]);
  });
});

describe('TechniciansController access (AC10)', () => {
  it('guards every route with AdminGuard', () => {
    const guards = Reflect.getMetadata('__guards__', TechniciansController) as unknown[];
    expect(guards).toContain(AdminGuard);
  });

  it('refuses a non-admin before any repository call', async () => {
    const repo = fakeRepo();
    await Test.createTestingModule({
      controllers: [TechniciansController],
      providers: [{ provide: TECHNICIAN_REPOSITORY, useValue: repo }],
    }).compile();
    const guard = new AdminGuard();
    const ctx = { switchToHttp: () => ({ getRequest: () => ({ headers: { 'x-user-role': 'technician' } }) }) };
    expect(() => guard.canActivate(ctx as never)).toThrow(ForbiddenException);
    expect(repo.create).not.toHaveBeenCalled();
  });
});
