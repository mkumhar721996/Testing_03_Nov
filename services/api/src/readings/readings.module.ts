import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { PostgresReadingsRepository } from './postgres-readings.repository';
import { READING_TYPES, READING_TYPES_TOKEN, type ReadingTypeConfig } from './reading-types.config';
import { ReadingsController } from './readings.controller';
import { READINGS_REPOSITORY } from './readings.repository';
import { ReadingsService } from './readings.service';

/** Refuses to boot with no reading types, so an unconfigured build can never ship an unusable form. */
export function assertReadingTypesConfigured(types: ReadingTypeConfig[]): ReadingTypeConfig[] {
  if (types.length === 0) {
    throw new Error('No reading types configured: add them to reading-types.config.ts before starting the API.');
  }
  return types;
}

@Module({
  controllers: [ReadingsController],
  providers: [
    ReadingsService,
    { provide: READING_TYPES_TOKEN, useFactory: () => assertReadingTypesConfigured(READING_TYPES) },
    {
      provide: READINGS_REPOSITORY,
      useFactory: () => new PostgresReadingsRepository(new Pool({ connectionString: process.env.DATABASE_URL })),
    },
  ],
})
export class ReadingsModule {}
