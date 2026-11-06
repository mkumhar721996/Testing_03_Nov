import { BadRequestException, Body, Controller, Get, Inject, Param, Post, Put, Query } from '@nestjs/common';
import { CAPACITY_REPOSITORY, type BookingView, type CapacityRepository } from './capacity.repository';
import { CapacityService, assertDay, type DaySlots, type DayView } from './capacity.service';
import { CurrentIdentity, type Identity } from './identity';

const MAX_DAYS = 31;

function addDays(day: string, n: number): string {
  return new Date(Date.parse(`${day}T00:00:00Z`) + n * 86_400_000).toISOString().slice(0, 10);
}

@Controller()
export class CapacityController {
  constructor(
    private readonly capacity: CapacityService,
    @Inject(CAPACITY_REPOSITORY) private readonly repo: CapacityRepository,
  ) {}

  @Put('visit-limits/:day')
  async setLimit(
    @CurrentIdentity() identity: Identity,
    @Param('day') day: string,
    @Body() body: { limit: number },
  ): Promise<DayView> {
    await this.capacity.setLimit(identity, day, body?.limit);
    return this.capacity.dayView(day);
  }

  @Get('visit-limits')
  async list(
    @CurrentIdentity() identity: Identity,
    @Query('from') from: string,
    @Query('days') days = '5',
  ): Promise<DayView[]> {
    const count = Number(days);
    if (!Number.isInteger(count) || count < 1 || count > MAX_DAYS) {
      throw new BadRequestException(`days must be a whole number from 1 to ${MAX_DAYS}`);
    }
    const start = assertDay(from);
    return this.capacity.listDays(
      identity,
      Array.from({ length: count }, (_, i) => addDays(start, i)),
    );
  }

  @Get('visit-limits/:day/bookings')
  bookings(@CurrentIdentity() identity: Identity, @Param('day') day: string): Promise<BookingView[]> {
    return this.capacity.bookingsFor(identity, day);
  }

  @Get('slots/:day')
  slots(@CurrentIdentity() _identity: Identity, @Param('day') day: string): Promise<DaySlots> {
    return this.capacity.slotsFor(day);
  }

  @Post('bookings')
  book(
    @CurrentIdentity() identity: Identity,
    @Body() body: { day: string; window: string },
  ): Promise<{ bookingId: string }> {
    return this.capacity.book(identity, body?.day, body?.window);
  }
}
