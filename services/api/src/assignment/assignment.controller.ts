import {
  BadRequestException,
  Body,
  ConflictException,
  Controller,
  Get,
  HttpCode,
  Inject,
  NotFoundException,
  Param,
  ParseUUIDPipe,
  Post,
  Query,
  UseGuards,
} from '@nestjs/common';
import { AdminGuard } from '../technicians/admin.guard';
import { TECHNICIAN_REPOSITORY, type TechnicianRepository } from '../technicians/technician.repository';
import { isUuid } from '../technicians/technician.validation';
import type { AssignableBooking, Notification } from './assignment.model';
import { ASSIGNMENT_REPOSITORY, type AssignmentRepository } from './assignment.repository';

export interface TechnicianOption {
  id: string;
  name: string;
  serviceArea: string | null;
  /** The technician's hours on the booking's weekday; null when they do not work that day. */
  workingHours: { start: string; end: string } | null;
  daysOff: string[];
  jobsOnDay: AssignableBooking[];
}

/** Every route is admin-only. Availability is shown for information and never blocks an assignment. */
@Controller()
@UseGuards(AdminGuard)
export class AssignmentController {
  constructor(
    @Inject(ASSIGNMENT_REPOSITORY) private readonly bookings: AssignmentRepository,
    @Inject(TECHNICIAN_REPOSITORY) private readonly technicians: TechnicianRepository,
  ) {}

  @Get('bookings')
  list(@Query('assignment') assignment?: string): Promise<AssignableBooking[]> {
    if (assignment !== 'unassigned' && assignment !== 'assigned') {
      throw new BadRequestException('assignment must be unassigned or assigned');
    }
    return this.bookings.listBookings(assignment);
  }

  @Get('bookings/:id/technician-options')
  async options(@Param('id', ParseUUIDPipe) id: string): Promise<TechnicianOption[]> {
    const booking = await this.bookings.getBooking(id);
    if (!booking) throw new NotFoundException('Booking not found');
    const weekday = new Date(`${booking.day}T00:00:00Z`).getUTCDay();
    const active = await this.technicians.listAssignable();
    return Promise.all(
      active.map(async (t) => {
        const profile = await this.technicians.get(t.id);
        const hours = profile?.workingHours.find((h) => h.weekday === weekday);
        return {
          id: t.id,
          name: t.name,
          serviceArea: t.serviceArea,
          workingHours: hours ? { start: hours.start, end: hours.end } : null,
          daysOff: profile?.daysOff ?? [],
          jobsOnDay: await this.bookings.bookingsHeldOn(t.id, booking.day, booking.id),
        };
      }),
    );
  }

  @Post('bookings/:id/technician')
  @HttpCode(200)
  async assign(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() body: { technicianId?: string },
  ): Promise<{ booking: AssignableBooking; notified: Notification[] }> {
    const target = isUuid(body?.technicianId) ? await this.technicians.get(body.technicianId) : null;
    if (!target?.active) throw new BadRequestException('Choose an active technician');
    const booking = await this.bookings.getBooking(id);
    if (!booking) throw new NotFoundException('Booking not found');
    if (booking.technicianId === target.id) throw new BadRequestException('Choose a different technician');
    const result = await this.bookings.assign(id, target.id);
    if (result.outcome === 'not_found') throw new NotFoundException('Booking not found');
    if (result.outcome === 'locked') {
      throw new ConflictException({ message: 'This booking can no longer be reassigned', booking: result.booking });
    }
    return { booking: result.booking, notified: result.notified };
  }
}
