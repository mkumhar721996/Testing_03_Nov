import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { READING_TYPES_TOKEN, type ReadingTypeConfig } from './reading-types.config';
import { validateReading } from './reading-validation';
import {
  READINGS_REPOSITORY,
  type ReadingsRepository,
  type StoredReading,
} from './readings.repository';

export interface PatientContext {
  tenantId: string;
  patientId: string;
}

export interface CreateReadingDto {
  clientRequestId: string;
  type: string;
  values: Record<string, unknown>;
  date: string;
  note?: string;
}

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class ReadingsService {
  constructor(
    @Inject(READINGS_REPOSITORY) private readonly repo: ReadingsRepository,
    @Inject(READING_TYPES_TOKEN) private readonly types: ReadingTypeConfig[],
  ) {}

  async save(
    ctx: PatientContext,
    dto: CreateReadingDto,
  ): Promise<{ reading: StoredReading; created: boolean }> {
    if (typeof dto.clientRequestId !== 'string' || !UUID.test(dto.clientRequestId)) {
      throw new BadRequestException({ field: 'clientRequestId', message: 'Send a valid request id.' });
    }
    const result = validateReading(dto, this.types, new Date());
    if (!result.ok) {
      throw new BadRequestException({ field: result.field, message: result.message });
    }
    return this.repo.create({
      tenantId: ctx.tenantId,
      patientId: ctx.patientId,
      clientRequestId: dto.clientRequestId,
      type: dto.type,
      values: dto.values as Record<string, number>,
      date: dto.date,
      note: dto.note || undefined,
    });
  }
}
