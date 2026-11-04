import type { Pool } from 'pg';
import type { Organization, OrganizationRepository } from './organization.repository';

interface OrganizationRow {
  id: string;
  name: string;
  address: string;
  admin_name: string;
  admin_email: string;
  created_by: string;
  finance_contact_role: string;
  finance_contact_name: string;
  finance_contact_email: string | null;
  finance_contact_phone: string | null;
}

export class PgOrganizationRepository implements OrganizationRepository {
  constructor(private readonly pool: Pool) {}

  async findById(id: string): Promise<Organization | null> {
    const { rows } = await this.pool.query<OrganizationRow>(
      `SELECT id, name, address, admin_name, admin_email, created_by,
              finance_contact_role, finance_contact_name, finance_contact_email, finance_contact_phone
         FROM organizations WHERE id = $1`,
      [id],
    );
    const row = rows[0];
    if (!row) return null;
    return {
      id: row.id,
      name: row.name,
      address: row.address,
      admin: { name: row.admin_name, email: row.admin_email },
      createdBy: row.created_by,
      financeContact: {
        role: row.finance_contact_role,
        name: row.finance_contact_name,
        email: row.finance_contact_email,
        phone: row.finance_contact_phone,
      },
    };
  }
}
