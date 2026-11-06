import { CLOSED_JOB_STATUSES, type Job, type NewTechnician, type WorkingDay } from './technician.model';

const TIME = /^([01]\d|2[0-3]):[0-5]\d$/;

type FieldErrors = { name?: string; loginEmail?: string };

function text(v: unknown): string {
  return typeof v === 'string' ? v.trim() : '';
}

export function validateNewTechnician(
  input: unknown,
): { ok: true; value: NewTechnician } | { ok: false; errors: FieldErrors } {
  const body = (input && typeof input === 'object' ? input : {}) as Record<string, unknown>;
  const name = text(body.name);
  const loginEmail = text(body.loginEmail);
  const errors: FieldErrors = {};
  if (!name) errors.name = 'Enter the technician’s full name';
  if (!loginEmail) errors.loginEmail = 'Enter the technician’s login email';
  if (errors.name || errors.loginEmail) return { ok: false, errors };
  const value: NewTechnician = { name, loginEmail };
  for (const key of ['phone', 'serviceArea', 'notes'] as const) {
    const v = text(body[key]);
    if (v) value[key] = v;
  }
  return { ok: true, value };
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export function isUuid(v: unknown): v is string {
  return typeof v === 'string' && UUID.test(v);
}

/** True for a real calendar date written YYYY-MM-DD (rejects 2026-02-30). */
export function isCalendarDate(v: unknown): v is string {
  if (typeof v !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(v)) return false;
  const d = new Date(`${v}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().startsWith(v);
}

/** Returns an error message per weekday that cannot be saved; empty when the schedule is valid. */
export function validateWeeklyHours(days: WorkingDay[]): Record<number, string> {
  const errors: Record<number, string> = {};
  const seen = new Set<number>();
  for (const d of days) {
    if (!d || typeof d !== 'object') {
      errors[-1] = 'Each working day needs a weekday, start and end time';
    } else if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) {
      errors[d.weekday] = 'Choose a day of the week';
    } else if (seen.size === seen.add(d.weekday).size) {
      errors[d.weekday] = 'Each day can only be listed once';
    } else if (typeof d.start !== 'string' || typeof d.end !== 'string' || !TIME.test(d.start) || !TIME.test(d.end)) {
      errors[d.weekday] = 'Enter times as HH:MM';
    } else if (d.end <= d.start) {
      errors[d.weekday] = 'End time must be after the start time';
    }
  }
  return errors;
}

/** Open jobs the admin must reassign: all of them, or only those on `onDate` when given. */
export function jobsToReassign(jobs: Job[], onDate?: string): Job[] {
  return jobs.filter(
    (j) => !CLOSED_JOB_STATUSES.includes(j.status) && (onDate === undefined || j.scheduledDate === onDate),
  );
}
