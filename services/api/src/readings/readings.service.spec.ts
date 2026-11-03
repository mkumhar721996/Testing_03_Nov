import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { InMemoryReadingsRepository } from './in-memory-readings.repository';
import type { ReadingTypeConfig } from './reading-types.config';
import { ReadingsService, type CreateReadingDto } from './readings.service';

const FIXTURE: ReadingTypeConfig[] = [
  { id: 'fx', label: 'Fixture', fields: [{ key: 'value', label: 'Value', unit: 'fx', min: 10, max: 20 }] },
];
const ctx = { tenantId: 'tenant-1', patientId: 'patient-1' };
const dto: CreateReadingDto = {
  clientRequestId: '6f1c1f0e-0000-4000-8000-000000000001',
  type: 'fx',
  values: { value: 15 },
  date: new Date().toISOString().slice(0, 10),
};

function setup() {
  const repo = new InMemoryReadingsRepository();
  return { repo, service: new ReadingsService(repo, FIXTURE) };
}

describe('ReadingsService', () => {
  it('saves a valid reading scoped to the patient and tenant', async () => {
    const { service, repo } = setup();
    const { reading, created } = await service.save(ctx, dto);
    expect(created).toBe(true);
    expect(reading).toMatchObject({ tenantId: 'tenant-1', patientId: 'patient-1', type: 'fx' });
    expect(repo.count()).toBe(1);
  });

  it('is idempotent on the client request id', async () => {
    const { service, repo } = setup();
    const a = await service.save(ctx, dto);
    const b = await service.save(ctx, dto);
    expect(b.reading.id).toBe(a.reading.id);
    expect(a.created).toBe(true);
    expect(b.created).toBe(false);
    expect(repo.count()).toBe(1);
  });

  it('keeps the same request id separate per patient and tenant', async () => {
    const { service, repo } = setup();
    await service.save(ctx, dto);
    await expect(service.save({ ...ctx, patientId: 'other' }, dto)).resolves.toMatchObject({ created: true });
    await expect(service.save({ ...ctx, tenantId: 'other' }, dto)).resolves.toMatchObject({ created: true });
    expect(repo.count()).toBe(3);
  });

  it('rejects an invalid reading with the field and message, saving nothing', async () => {
    const { service, repo } = setup();
    const bad = { ...dto, values: { value: 21 } };
    await expect(service.save(ctx, bad)).rejects.toBeInstanceOf(BadRequestException);
    await expect(service.save(ctx, bad)).rejects.toMatchObject({
      response: { field: 'value', message: 'Enter a value between 10 and 20 fx.' },
    });
    expect(repo.count()).toBe(0);
  });

  it('rejects a missing or malformed client request id', async () => {
    const { service } = setup();
    await expect(service.save(ctx, { ...dto, clientRequestId: 'x' })).rejects.toMatchObject({
      response: { field: 'clientRequestId' },
    });
  });
});
