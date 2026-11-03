import type { ReadingTypeConfig } from './reading-types.config';

export interface ReadingInput {
  type: string;
  values: Record<string, unknown>;
  date: string;
  note?: string;
}

export type ValidationResult = { ok: true } | { ok: false; field: string; message: string };

export const NOTE_MAX_LENGTH = 500;
const DAY_MS = 24 * 60 * 60 * 1000;

const fail = (field: string, message: string): ValidationResult => ({ ok: false, field, message });

/** Pure validation against the configured limits; `todayUtc` is injected for testability. */
export function validateReading(
  input: ReadingInput,
  types: ReadingTypeConfig[],
  todayUtc: Date,
): ValidationResult {
  const type = types.find((t) => t.id === input.type);
  if (!type) return fail('type', 'Choose a reading type.');

  const values = input.values ?? {};
  for (const f of type.fields) {
    const v = values[f.key];
    if (typeof v !== 'number' || !Number.isFinite(v)) {
      return fail(f.key, `Enter a ${f.label.toLowerCase()}.`);
    }
    if (v < f.min || v > f.max) {
      const range = `${f.min} and ${f.max} ${f.unit}.`;
      return fail(
        f.key,
        type.fields.length > 1 ? `${f.label} must be between ${range}` : `Enter a value between ${range}`,
      );
    }
  }

  if (typeof input.date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(input.date)) {
    return fail('date', 'Enter a date as YYYY-MM-DD.');
  }
  const date = Date.parse(`${input.date}T00:00:00Z`);
  const latest = Date.parse(todayUtc.toISOString().slice(0, 10) + 'T00:00:00Z') + DAY_MS;
  if (Number.isNaN(date) || new Date(date).toISOString().slice(0, 10) !== input.date || date > latest) {
    return fail('date', 'Choose today or an earlier date.');
  }

  if (input.note !== undefined && (typeof input.note !== 'string' || input.note.length > NOTE_MAX_LENGTH)) {
    return fail('note', `Note must be at most ${NOTE_MAX_LENGTH} characters.`);
  }
  return { ok: true };
}
