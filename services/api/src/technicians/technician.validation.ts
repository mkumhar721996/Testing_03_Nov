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

/** Returns an error message per weekday that cannot be saved; empty when the schedule is valid. */
export function validateWeeklyHours(days: WorkingDay[]): Record<number, string> {
  const errors: Record<number, string> = {};
  for (const d of days) {
    if (!Number.isInteger(d.weekday) || d.weekday < 0 || d.weekday > 6) {
      errors[d.weekday] = 'Choose a day of the week';
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
