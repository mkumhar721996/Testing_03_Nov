import type { Address, Category, Service } from './booking.types';

export const BOOKING_REPOSITORY = Symbol('BOOKING_REPOSITORY');

export interface BookingRepository {
  listCategories(): Promise<Category[]>;
  listServices(categoryId: string): Promise<Service[]>;
  getService(serviceId: string): Promise<Service | null>;
  /** Only that customer's rows. */
  listAddresses(customerId: string): Promise<Address[]>;
  /** Null when the address does not exist or belongs to someone else. */
  getAddress(customerId: string, addressId: string): Promise<Address | null>;
}
