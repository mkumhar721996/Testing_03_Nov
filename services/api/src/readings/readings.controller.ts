import { Body, Controller, Get, Inject, Post, Res } from '@nestjs/common';
import { CurrentPatient } from './current-patient.decorator';
import { READING_TYPES_TOKEN, type ReadingTypeConfig } from './reading-types.config';
import type { StoredReading } from './readings.repository';
import { ReadingsService, type CreateReadingDto, type PatientContext } from './readings.service';

@Controller()
export class ReadingsController {
  constructor(
    private readonly service: ReadingsService,
    @Inject(READING_TYPES_TOKEN) private readonly readingTypes: ReadingTypeConfig[],
  ) {}

  @Get('reading-types')
  types(): ReadingTypeConfig[] {
    return this.readingTypes;
  }

  /** 201 when created, 200 on an idempotent replay. */
  @Post('readings')
  async create(
    @CurrentPatient() ctx: PatientContext,
    @Body() dto: CreateReadingDto,
    @Res({ passthrough: true }) res: { status(code: number): unknown },
  ): Promise<StoredReading> {
    const { reading, created } = await this.service.save(ctx, dto);
    res.status(created ? 201 : 200);
    return reading;
  }
}
