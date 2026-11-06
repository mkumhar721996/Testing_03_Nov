import type { Pool } from 'pg';
import type { BookingRepository } from './booking.repository';
import type { Address, Category, Service } from './booking.types';

interface ServiceRow {
  id: string;
  category_id: string;
  name: string;
  note: string;
}

interface AddressRow {
  id: string;
  customer_id: string;
  label: string;
  line: string;
  time_zone: string;
}

const toService = (r: ServiceRow): Service => ({ id: r.id, categoryId: r.category_id, name: r.name, note: r.note });
const toAddress = (r: AddressRow): Address => ({
  id: r.id,
  customerId: r.customer_id,
  label: r.label,
  line: r.line,
  timeZone: r.time_zone,
});

const ADDRESS_COLUMNS = 'id, customer_id, label, line, time_zone';

export class PgBookingRepository implements BookingRepository {
  constructor(private readonly pool: Pool) {}

  async listCategories(): Promise<Category[]> {
    const { rows } = await this.pool.query<Category>('SELECT id, name FROM service_categories ORDER BY name');
    return rows;
  }

  async listServices(categoryId: string): Promise<Service[]> {
    const { rows } = await this.pool.query<ServiceRow>(
      'SELECT id, category_id, name, note FROM services WHERE category_id = $1 ORDER BY name',
      [categoryId],
    );
    return rows.map(toService);
  }

  async getService(serviceId: string): Promise<Service | null> {
    const { rows } = await this.pool.query<ServiceRow>(
      'SELECT id, category_id, name, note FROM services WHERE id = $1',
      [serviceId],
    );
    return rows[0] ? toService(rows[0]) : null;
  }

  async listAddresses(customerId: string): Promise<Address[]> {
    const { rows } = await this.pool.query<AddressRow>(
      `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE customer_id = $1 ORDER BY label, id`,
      [customerId],
    );
    return rows.map(toAddress);
  }

  async getAddress(customerId: string, addressId: string): Promise<Address | null> {
    const { rows } = await this.pool.query<AddressRow>(
      `SELECT ${ADDRESS_COLUMNS} FROM addresses WHERE id = $1 AND customer_id = $2`,
      [addressId, customerId],
    );
    return rows[0] ? toAddress(rows[0]) : null;
  }
}
