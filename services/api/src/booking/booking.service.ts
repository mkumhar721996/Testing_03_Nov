import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { CapacityService } from '../capacity/capacity.service';
import { assertCustomer, type Identity } from '../capacity/identity';
import { VISIT_FEE, zoneLabel } from './booking.constants';
import { BOOKING_REPOSITORY, type BookingRepository } from './booking.repository';
import type { Address, Category, ConfirmedBooking, Service, SlotsForAddress } from './booking.types';

export interface HomeVisitInput {
  serviceId?: string;
  addressId?: string;
  day?: string;
  window?: string;
}

@Injectable()
export class BookingService {
  constructor(
    @Inject(BOOKING_REPOSITORY) private readonly repo: BookingRepository,
    private readonly capacity: CapacityService,
  ) {}

  async categories(identity: Identity): Promise<{ categories: Category[]; visitFee: typeof VISIT_FEE }> {
    assertCustomer(identity);
    return { categories: await this.repo.listCategories(), visitFee: VISIT_FEE };
  }

  async services(identity: Identity, categoryId: string): Promise<Service[]> {
    assertCustomer(identity);
    const categories = await this.repo.listCategories();
    if (!categories.some((c) => c.id === categoryId)) throw new NotFoundException('Category not found.');
    return this.repo.listServices(categoryId);
  }

  async addresses(identity: Identity): Promise<Address[]> {
    assertCustomer(identity);
    return this.repo.listAddresses(identity.userId);
  }

  async slots(identity: Identity, day: string, addressId: string): Promise<SlotsForAddress> {
    assertCustomer(identity);
    const address = await this.ownAddress(identity, addressId);
    const { slots } = await this.capacity.slotsFor(day);
    return { day, timeZone: address.timeZone, zoneLabel: zoneLabel(day, address.timeZone), slots };
  }

  async bookHomeVisit(identity: Identity, input: HomeVisitInput): Promise<ConfirmedBooking> {
    assertCustomer(identity);
    const { serviceId, addressId, day = '', window = '' } = input ?? {};
    if (!addressId && (await this.repo.listAddresses(identity.userId)).length === 0) {
      throw new BadRequestException('Add an address before you book.');
    }
    const service = serviceId ? await this.repo.getService(serviceId) : null;
    if (!service) throw new NotFoundException('Service not found.');
    const address = await this.ownAddress(identity, addressId);
    const { bookingId } = await this.capacity.book(identity, day, window, {
      serviceId: service.id,
      addressId: address.id,
      visitFee: VISIT_FEE.amount,
      feeCurrency: VISIT_FEE.currency,
    });
    return {
      bookingId,
      status: 'confirmed',
      visitFee: { ...VISIT_FEE },
      service,
      address,
      day,
      window,
      zoneLabel: zoneLabel(day, address.timeZone),
    };
  }

  /** 404 for an address that is missing or belongs to someone else. */
  private async ownAddress(identity: Identity, addressId: string | undefined): Promise<Address> {
    const address = addressId ? await this.repo.getAddress(identity.userId, addressId) : null;
    if (!address) throw new NotFoundException('Address not found.');
    return address;
  }
}
