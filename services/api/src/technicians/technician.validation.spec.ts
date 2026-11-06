import { describe, expect, it } from 'vitest';
import type { Job } from './technician.model';
import { isCalendarDate, isUuid, jobsToReassign, validateNewTechnician, validateWeeklyHours } from './technician.validation';

describe('validateNewTechnician', () => {
  it('accepts only a name and login email (AC13)', () => {
    expect(validateNewTechnician({ name: 'A', loginEmail: 'a@x.example' })).toMatchObject({ ok: true });
  });

  it('trims the required fields', () => {
    expect(validateNewTechnician({ name: ' A ', loginEmail: ' a@x.example ' })).toEqual({
      ok: true,
      value: { name: 'A', loginEmail: 'a@x.example' },
    });
  });

  it('flags a blank name (AC14)', () => {
    expect(validateNewTechnician({ name: '  ', loginEmail: 'a@x.example' })).toEqual({
      ok: false,
      errors: { name: expect.any(String) },
    });
  });

  it('flags a blank login email (AC14)', () => {
    expect(validateNewTechnician({ name: 'A', loginEmail: '' })).toMatchObject({
      ok: false,
      errors: { loginEmail: expect.any(String) },
    });
  });

  it('flags both when the body is not an object', () => {
    expect(validateNewTechnician(null)).toMatchObject({
      ok: false,
      errors: { name: expect.any(String), loginEmail: expect.any(String) },
    });
  });
});

describe('validateWeeklyHours', () => {
  it('refuses an end that is not after the start (AC15)', () => {
    expect(validateWeeklyHours([{ weekday: 1, start: '16:00', end: '16:00' }])).toEqual({ 1: expect.any(String) });
    expect(validateWeeklyHours([{ weekday: 2, start: '17:00', end: '09:00' }])).toEqual({ 2: expect.any(String) });
  });

  it('accepts valid days (AC3)', () => {
    expect(validateWeeklyHours([{ weekday: 1, start: '08:00', end: '16:00' }])).toEqual({});
  });

  it('refuses malformed times and weekdays', () => {
    expect(validateWeeklyHours([{ weekday: 1, start: '8am', end: '16:00' }])).toEqual({ 1: expect.any(String) });
    expect(validateWeeklyHours([{ weekday: 9, start: '08:00', end: '16:00' }])).toEqual({ 9: expect.any(String) });
  });
});

describe('validateWeeklyHours edge cases', () => {
  it('refuses the same weekday listed twice', () => {
    const day = { weekday: 1, start: '08:00', end: '16:00' };
    expect(validateWeeklyHours([day, day])).toEqual({ 1: expect.any(String) });
  });

  it('refuses entries that are not objects', () => {
    expect(validateWeeklyHours([null as never])).toEqual({ [-1]: expect.any(String) });
  });

  it('accepts an empty schedule and the full week', () => {
    expect(validateWeeklyHours([])).toEqual({});
    const week = [0, 1, 2, 3, 4, 5, 6].map((weekday) => ({ weekday, start: '00:00', end: '23:59' }));
    expect(validateWeeklyHours(week)).toEqual({});
  });

  it('refuses out-of-range times', () => {
    expect(validateWeeklyHours([{ weekday: 1, start: '08:00', end: '24:00' }])).toEqual({ 1: expect.any(String) });
  });
});

describe('isCalendarDate', () => {
  it.each(['2026-11-12', '2028-02-29'])('accepts %s', (d) => expect(isCalendarDate(d)).toBe(true));
  it.each(['2026-02-30', '2027-02-29', '2026-13-01', '2026-1-1', 'tomorrow', '', 20261112, null])(
    'rejects %s',
    (d) => expect(isCalendarDate(d)).toBe(false),
  );
});

describe('isUuid', () => {
  it('accepts a uuid and rejects other values', () => {
    expect(isUuid('3f2b8c1e-0a4d-4e5b-9c1a-7d6e5f4a3b2c')).toBe(true);
    expect(isUuid('job-1')).toBe(false);
    expect(isUuid(undefined)).toBe(false);
  });
});

describe('validateNewTechnician edge cases', () => {
  it('ignores non-string values and blank optional fields', () => {
    expect(validateNewTechnician({ name: 'A', loginEmail: 'a@x.example', phone: 5, notes: '  ' })).toEqual({
      ok: true,
      value: { name: 'A', loginEmail: 'a@x.example' },
    });
  });

  it('treats a non-string name as blank', () => {
    expect(validateNewTechnician({ name: 7, loginEmail: 'a@x.example' })).toMatchObject({
      ok: false,
      errors: { name: expect.any(String) },
    });
  });
});

describe('jobsToReassign', () => {
  it('excludes cancelled jobs on deactivation', () => {
    const j = (status: string): Job => ({
      id: status, title: status, customer: 'c', scheduledDate: '2026-11-12', scheduledTime: null, technicianId: 't', status,
    });
    expect(jobsToReassign([j('open'), j('in_progress'), j('cancelled'), j('completed')]).map((x) => x.id)).toEqual([
      'open',
      'in_progress',
    ]);
  });
});

describe('jobsToReassign', () => {
  const job = (id: string, date: string, status = 'open'): Job => ({
    id,
    title: id,
    customer: 'c',
    scheduledDate: date,
    scheduledTime: null,
    technicianId: 't',
    status,
  });
  const jobs = [job('1', '2026-11-12'), job('2', '2026-11-13'), job('3', '2026-11-12', 'completed')];

  it('returns every open job on deactivation (AC7)', () => {
    expect(jobsToReassign(jobs).map((j) => j.id)).toEqual(['1', '2']);
  });

  it('returns only open jobs on the day off (AC11, AC12)', () => {
    expect(jobsToReassign(jobs, '2026-11-12').map((j) => j.id)).toEqual(['1']);
    expect(jobsToReassign(jobs, '2026-11-14')).toEqual([]);
  });
});
