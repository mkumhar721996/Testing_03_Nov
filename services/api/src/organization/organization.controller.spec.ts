import { describe, expect, it } from 'vitest';
import { OrganizationController } from './organization.controller';
import type { Organization, OrganizationRepository } from './organization.repository';

const org = (id: string, name: string): Organization => ({
  id,
  name,
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
  createdAt: '2026-01-02T03:04:05.000Z',
});

const fakeRepo = (orgs: Organization[]): OrganizationRepository => ({ listAll: async () => orgs });

describe('OrganizationController', () => {
  it('returns what the repository lists, in order (AC9)', async () => {
    const orgs = [org('a', 'Alpha Org'), org('b', 'Beta Org')];
    expect(await new OrganizationController(fakeRepo(orgs)).list()).toEqual(orgs);
  });
});
