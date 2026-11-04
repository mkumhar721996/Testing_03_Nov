import type { Pool } from 'pg';
import { describe, expect, it } from 'vitest';
import { PgOrganizationRepository } from './pg-organization.repository';

const nullRow = {
  id: 'org-a',
  name: 'Alpha',
  type: null,
  reference: null,
  phone: null,
  street: null,
  street2: null,
  city: null,
  state: null,
  postal_code: null,
  admin_name: null,
  admin_email: null,
  admin_phone: null,
  created_by_name: null,
  created_by_role: null,
  created_at: null,
};

const poolReturning = (rows: unknown[]) => ({ query: async () => ({ rows }) }) as unknown as Pool;

describe('PgOrganizationRepository', () => {
  it('maps NULL columns to null fields (AC15)', async () => {
    const [found] = await new PgOrganizationRepository(poolReturning([nullRow])).listAll();
    expect(found).toEqual({
      id: 'org-a',
      name: 'Alpha',
      type: null,
      reference: null,
      phone: null,
      street: null,
      street2: null,
      city: null,
      state: null,
      postalCode: null,
      adminName: null,
      adminEmail: null,
      adminPhone: null,
      createdByName: null,
      createdByRole: null,
      createdAt: null,
    });
  });

  it('serialises created_at as an ISO string and returns null for an unknown id', async () => {
    const at = new Date('2026-01-02T03:04:05.000Z');
    const [found] = await new PgOrganizationRepository(poolReturning([{ ...nullRow, created_at: at }])).listAll();
    expect(found.createdAt).toBe('2026-01-02T03:04:05.000Z');
    expect(await new PgOrganizationRepository(poolReturning([])).findById('x')).toBeNull();
  });
});
