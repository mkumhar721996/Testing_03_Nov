import type { Pool } from 'pg';
import type { Organization, OrganizationRepository } from './organization.repository';

interface OrganizationRow {
  id: string;
  name: string;
  type: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  postal_code: string | null;
  country: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  created_by_name: string | null;
  created_at: Date | null;
}

const COLUMNS =
  'id, name, type, street, city, region, postal_code, country, admin_name, admin_email, admin_phone, created_by_name, created_at';

const toOrganization = (row: OrganizationRow): Organization => ({
  id: row.id,
  name: row.name,
  type: row.type,
  street: row.street,
  city: row.city,
  region: row.region,
  postalCode: row.postal_code,
  country: row.country,
  adminName: row.admin_name,
  adminEmail: row.admin_email,
  adminPhone: row.admin_phone,
  createdByName: row.created_by_name,
  createdAt: row.created_at ? row.created_at.toISOString() : null,
});

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async listAll(): Promise<Organization[]> {
    const { rows } = await this.pool.query<OrganizationRow>(`SELECT ${COLUMNS} FROM organizations ORDER BY name`);
    return rows.map(toOrganization);
  }

  async findById(id: string): Promise<Organization | null> {
    const { rows } = await this.pool.query<OrganizationRow>(`SELECT ${COLUMNS} FROM organizations WHERE id = $1`, [id]);
    return rows.length ? toOrganization(rows[0]) : null;
  }
}
