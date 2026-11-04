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

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('004_organizations.sql'));
    repo = new PgOrganizationRepository(pool);
  });

  afterAll(async () => {
    await pool.end();
  });

  it('maps NULL columns to null fields so the UI can show "-"', async () => {
    const id = randomUUID();
    await pool.query("INSERT INTO organizations (id, name) VALUES ($1, 'Bare Org')", [id]);
    const found = (await repo.listAll()).find((o) => o.id === id)!;
    expect(found.name).toBe('Bare Org');
    expect(found.phone).toBeNull();
    expect(found.street2).toBeNull();
    expect(typeof found.createdAt).toBe('string');
  });

  it('maps stored columns to camelCase fields', async () => {
    const id = randomUUID();
    await pool.query(
      "INSERT INTO organizations (id, name, postal_code, admin_name, created_by_role) VALUES ($1, 'Full Org', '98101', 'Dana', 'WFC Admin')",
      [id],
    );
    const found = (await repo.listAll()).find((o) => o.id === id)!;
    expect(found).toMatchObject({ postalCode: '98101', adminName: 'Dana', createdByRole: 'WFC Admin' });
  });
});
