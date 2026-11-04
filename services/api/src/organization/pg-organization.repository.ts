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
  created_at: Date;
}

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async listAll(): Promise<Organization[]> {
    const { rows } = await this.pool.query<OrganizationRow>(
      `SELECT id, name, type, reference, phone, street, street2, city, state, postal_code,
              admin_name, admin_email, admin_phone, created_by_name, created_by_role, created_at
         FROM organizations ORDER BY name`,
    );
    return rows.map((r) => ({
      id: r.id,
      name: r.name,
      type: r.type,
      reference: r.reference,
      phone: r.phone,
      street: r.street,
      street2: r.street2,
      city: r.city,
      state: r.state,
      postalCode: r.postal_code,
      adminName: r.admin_name,
      adminEmail: r.admin_email,
      adminPhone: r.admin_phone,
      createdByName: r.created_by_name,
      createdByRole: r.created_by_role,
      createdAt: r.created_at.toISOString(),
    }));
  }
}
