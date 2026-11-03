import { describe, expect, it } from 'vitest';
import type { ReadingTypeConfig } from './reading-types.config';
import { validateReading } from './reading-validation';

// Fixture limits only: the real ones come from Product and must not leak into tests.
const FIXTURE: ReadingTypeConfig[] = [
  {
    id: 'fx-single',
    label: 'Fixture single',
    fields: [{ key: 'value', label: 'Value', unit: 'fx', min: 10, max: 20 }],
  },
  {
    id: 'fx-pair',
    label: 'Fixture pair',
    fields: [
      { key: 'systolic', label: 'Systolic', unit: 'fxp', min: 50, max: 100 },
      { key: 'diastolic', label: 'Diastolic', unit: 'fxp', min: 30, max: 60 },
    ],
  },
];
const today = new Date('2026-11-03T12:00:00Z');
const single = (v: unknown, extra = {}) => ({
  type: 'fx-single',
  values: { value: v },
  date: '2026-11-03',
  ...extra,
});

describe('validateReading', () => {
  it('accepts min, max and a middle value', () => {
    for (const v of [10, 15, 20]) {
      expect(validateReading(single(v), FIXTURE, today)).toEqual({ ok: true });
    }
  });

  it('rejects below min and above max with range and unit', () => {
    const msg = 'Enter a value between 10 and 20 fx.';
    expect(validateReading(single(9), FIXTURE, today)).toEqual({ ok: false, field: 'value', message: msg });
    expect(validateReading(single(21), FIXTURE, today)).toEqual({ ok: false, field: 'value', message: msg });
  });

  it('rejects unknown type, missing and non-finite values', () => {
    expect(validateReading({ ...single(15), type: 'nope' }, FIXTURE, today)).toMatchObject({ ok: false, field: 'type' });
    expect(validateReading(single(undefined), FIXTURE, today)).toMatchObject({ ok: false, field: 'value' });
    expect(validateReading(single('15'), FIXTURE, today)).toMatchObject({ ok: false, field: 'value' });
    expect(validateReading(single(Infinity), FIXTURE, today)).toMatchObject({ ok: false, field: 'value' });
  });

  it('requires both fields of a pair and names the field in range errors', () => {
    const bp = (values: Record<string, unknown>) => ({ type: 'fx-pair', values, date: '2026-11-03' });
    expect(validateReading(bp({ systolic: 60, diastolic: 40 }), FIXTURE, today)).toEqual({ ok: true });
    expect(validateReading(bp({ systolic: 60 }), FIXTURE, today)).toMatchObject({ ok: false, field: 'diastolic' });
    expect(validateReading(bp({ systolic: 101, diastolic: 40 }), FIXTURE, today)).toEqual({
      ok: false,
      field: 'systolic',
      message: 'Systolic must be between 50 and 100 fxp.',
    });
  });

  it('rejects malformed and too-far-future dates, allows one day of slack', () => {
    expect(validateReading(single(15, { date: '2999-01-01' }), FIXTURE, today)).toMatchObject({ ok: false, field: 'date' });
    expect(validateReading(single(15, { date: '03/11/2026' }), FIXTURE, today)).toMatchObject({ ok: false, field: 'date' });
    expect(validateReading(single(15, { date: '2026-11-04' }), FIXTURE, today)).toEqual({ ok: true });
    expect(validateReading(single(15, { date: '2026-11-05' }), FIXTURE, today)).toMatchObject({ ok: false, field: 'date' });
  });

  it('caps the note at 500 characters', () => {
    expect(validateReading(single(15, { note: 'a'.repeat(500) }), FIXTURE, today)).toEqual({ ok: true });
    expect(validateReading(single(15, { note: 'a'.repeat(501) }), FIXTURE, today)).toMatchObject({ ok: false, field: 'note' });
  });
});
