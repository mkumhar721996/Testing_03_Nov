import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { currentPatientFromRequest } from './current-patient.decorator';
import { InMemoryReadingsRepository } from './in-memory-readings.repository';
import type { ReadingTypeConfig } from './reading-types.config';
import { ReadingsController } from './readings.controller';
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
  const controller = new ReadingsController(new ReadingsService(new InMemoryReadingsRepository(), FIXTURE), FIXTURE);
  const res = { status: 0, setStatus(code: number) { this.status = code; } };
  return { controller, res, respond: { status: (c: number) => res.setStatus(c) } as never };
}

describe('ReadingsController', () => {
  it('returns the reading type config', () => {
    expect(setup().controller.types()).toBe(FIXTURE);
  });

  it('answers 201 on create and 200 on an idempotent replay', async () => {
    const { controller, res, respond } = setup();
    await controller.create(ctx, dto, respond);
    expect(res.status).toBe(201);
    await controller.create(ctx, dto, respond);
    expect(res.status).toBe(200);
  });
});

describe('currentPatientFromRequest', () => {
  it('returns the authenticated tenant and patient only', () => {
    expect(currentPatientFromRequest({ auth: ctx, body: { patientId: 'evil' } })).toEqual(ctx);
  });

  it('throws 401 without request.auth', () => {
    expect(() => currentPatientFromRequest({})).toThrow(UnauthorizedException);
    expect(() => currentPatientFromRequest(undefined)).toThrow(UnauthorizedException);
  });
});
