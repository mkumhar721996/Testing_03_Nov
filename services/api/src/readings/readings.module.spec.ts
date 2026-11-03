import 'reflect-metadata';
import { describe, expect, it } from 'vitest';
import { PostgresReadingsRepository } from './postgres-readings.repository';
import type { ReadingTypeConfig } from './reading-types.config';
import { READING_TYPES_TOKEN } from './reading-types.config';
import { ReadingsController } from './readings.controller';
import { assertReadingTypesConfigured, ReadingsModule } from './readings.module';

const FIXTURE: ReadingTypeConfig[] = [
  { id: 'fx', label: 'Fixture', fields: [{ key: 'value', label: 'Value', unit: 'fx', min: 10, max: 20 }] },
];

describe('ReadingsModule', () => {
  it('refuses to start with an empty reading type list', () => {
    expect(() => assertReadingTypesConfigured([])).toThrow(/reading types/i);
  });

  it('accepts a configured list', () => {
    expect(assertReadingTypesConfigured(FIXTURE)).toBe(FIXTURE);
  });

  it('registers the controller', () => {
    expect(Reflect.getMetadata('controllers', ReadingsModule)).toContain(ReadingsController);
    expect(Reflect.getMetadata('providers', ReadingsModule).length).toBeGreaterThan(2);
    expect(READING_TYPES_TOKEN).toBeDefined();
  });
});

describe('PostgresReadingsRepository', () => {
  const row = {
    id: 'id-1', tenant_id: 't', patient_id: 'p', client_request_id: 'c', type: 'fx',
    values: { value: 15 }, reading_date: '2026-11-03', note: null, created_at: new Date(0), inserted: true,
  };

  it('inserts idempotently and maps the row', async () => {
    const calls: unknown[][] = [];
    const pool = { query: async (...a: unknown[]) => (calls.push(a), { rows: [row] }) };
    const repo = new PostgresReadingsRepository(pool as never);
    const out = await repo.create({
      tenantId: 't', patientId: 'p', clientRequestId: 'c', type: 'fx', values: { value: 15 }, date: '2026-11-03',
    });
    expect(out.created).toBe(true);
    expect(out.reading).toMatchObject({ id: 'id-1', tenantId: 't', patientId: 'p', date: '2026-11-03' });
    expect(String(calls[0][0])).toMatch(/on conflict \(tenant_id, patient_id, client_request_id\)/i);
    expect(calls[0][1]).toContain('t');
  });

  it('reports a replay as not created', async () => {
    const pool = { query: async () => ({ rows: [{ ...row, inserted: false }] }) };
    const repo = new PostgresReadingsRepository(pool as never);
    const out = await repo.create({
      tenantId: 't', patientId: 'p', clientRequestId: 'c', type: 'fx', values: { value: 15 }, date: '2026-11-03',
    });
    expect(out.created).toBe(false);
  });
});
