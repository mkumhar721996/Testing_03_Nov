import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { CurrentIdentity, type Identity } from '../capacity/identity';
import { BookingService, type HomeVisitInput } from './booking.service';
import type { Address, Category, ConfirmedBooking, Service, SlotsForAddress } from './booking.types';
import type { VISIT_FEE } from './booking.constants';

@Controller()
export class BookingController {
  constructor(private readonly booking: BookingService) {}

  @Get('service-categories')
  categories(@CurrentIdentity() identity: Identity): Promise<{ categories: Category[]; visitFee: typeof VISIT_FEE }> {
    return this.booking.categories(identity);
  }

  @Get('service-categories/:id/services')
  services(@CurrentIdentity() identity: Identity, @Param('id') id: string): Promise<Service[]> {
    return this.booking.services(identity, id);
  }

  @Get('addresses')
  addresses(@CurrentIdentity() identity: Identity): Promise<Address[]> {
    return this.booking.addresses(identity);
  }

  @Get('home-visit-slots')
  slots(
    @CurrentIdentity() identity: Identity,
    @Query('day') day: string,
    @Query('addressId') addressId: string,
  ): Promise<SlotsForAddress> {
    return this.booking.slots(identity, day, addressId);
  }

  @Post('home-visits')
  book(@CurrentIdentity() identity: Identity, @Body() body: HomeVisitInput): Promise<ConfirmedBooking> {
    return this.booking.bookHomeVisit(identity, body);
  }
}
