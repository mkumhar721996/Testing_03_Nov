import { describe, expect, it } from 'vitest';
import type { Job } from './technician.model';
import { jobsToReassign, validateNewTechnician, validateWeeklyHours } from './technician.validation';

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
