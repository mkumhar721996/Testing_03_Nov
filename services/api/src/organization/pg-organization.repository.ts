import type { Pool } from 'pg';
import type { Organization, OrganizationRepository } from './organization.repository';

interface OrganizationRow {
  id: string;
  name: string;
  type: string | null;
  reference: string | null;
  phone: string | null;
  street: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postal_code: string | null;
  admin_name: string | null;
  admin_email: string | null;
  admin_phone: string | null;
  created_by_name: string | null;
  created_by_role: string | null;
  created_at: Date | null;
}

const COLUMNS =
  'id, name, type, reference, phone, street, street2, city, state, postal_code, admin_name, admin_email, admin_phone, created_by_name, created_by_role, created_at';

const toOrganization = (row: OrganizationRow): Organization => ({
  id: row.id,
  name: row.name,
  type: row.type,
  reference: row.reference,
  phone: row.phone,
  street: row.street,
  street2: row.street2,
  city: row.city,
  state: row.state,
  postalCode: row.postal_code,
  adminName: row.admin_name,
  adminEmail: row.admin_email,
  adminPhone: row.admin_phone,
  createdByName: row.created_by_name,
  createdByRole: row.created_by_role,
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
