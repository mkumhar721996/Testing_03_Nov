import type { BookingRepository } from './booking.repository';
import type { Address, Category, Service } from './booking.types';

/** In-memory repository for unit tests. */
export class FakeBookingRepository implements BookingRepository {
  constructor(
    private readonly data: { categories: Category[]; services: Service[]; addresses: Address[] } = {
      categories: [],
      services: [],
      addresses: [],
    },
  ) {}

  async listCategories() {
    return this.data.categories;
  }

  async listServices(categoryId: string) {
    return this.data.services.filter((s) => s.categoryId === categoryId);
  }

  async getService(serviceId: string) {
    return this.data.services.find((s) => s.id === serviceId) ?? null;
  }

  async listAddresses(customerId: string) {
    return this.data.addresses.filter((a) => a.customerId === customerId);
  }

  async getAddress(customerId: string, addressId: string) {
    return this.data.addresses.find((a) => a.id === addressId && a.customerId === customerId) ?? null;
  }
}
