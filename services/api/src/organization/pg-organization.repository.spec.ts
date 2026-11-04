import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import { PgOrganizationRepository } from './pg-organization.repository';

const url = process.env.TEST_DATABASE_URL;

const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

describe.skipIf(!url)('PgOrganizationRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgOrganizationRepository;

  const insert = (id: string, email: string | null, phone: string | null) =>
    pool.query(
      `INSERT INTO organizations (id, name, address, admin_name, admin_email, created_by,
         finance_contact_role, finance_contact_name, finance_contact_email, finance_contact_phone)
       VALUES ($1, 'Locke Prep', '325 E 111th St', 'Karishmah', 'karishmah@gmail.com',
         'Daniel Gonzalez Bermudez', 'Fundraising Consultant', 'Morgan Gould', $2, $3)`,
      [id, email, phone],
    );

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('001_spin_records.sql'));
    await pool.query(migration('002_spin_total_win.sql'));
    await pool.query(migration('003_players.sql'));
    await pool.query(migration('004_organizations.sql'));
    repo = new PgOrganizationRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('maps the stored columns to the nested shape', async () => {
    const id = randomUUID();
    await insert(id, 'mgould@wfchocolate.com', '(555) 218-4400');
    expect(await repo.findById(id)).toEqual({
      id,
      name: 'Locke Prep',
      address: '325 E 111th St',
      admin: { name: 'Karishmah', email: 'karishmah@gmail.com' },
      createdBy: 'Daniel Gonzalez Bermudez',
      financeContact: {
        role: 'Fundraising Consultant',
        name: 'Morgan Gould',
        email: 'mgould@wfchocolate.com',
        phone: '(555) 218-4400',
      },
    });
  });

  it('returns null finance email and phone for NULL columns', async () => {
    const id = randomUUID();
    await insert(id, null, null);
    expect((await repo.findById(id))?.financeContact).toMatchObject({ email: null, phone: null });
  });

  it('returns null for an unknown id', async () => {
    expect(await repo.findById(randomUUID())).toBeNull();
  });
});
