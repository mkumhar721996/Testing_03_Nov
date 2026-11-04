import { describe, expect, it } from 'vitest';
import type { Organization, OrganizationRepository } from './organization.repository';
import { listVisibleOrganizations } from './organization.visibility';

const org = (id: string, name: string): Organization => ({
  id,
  name,
  type: null,
  street: null,
  city: null,
  region: null,
  postalCode: null,
  country: null,
  adminName: null,
  adminEmail: null,
  adminPhone: null,
  createdByName: null,
  createdAt: null,
});

const orgA = org('org-a', 'Alpha');
const orgB = org('org-b', 'Beta');

const fakeRepo = (orgs: Organization[]): OrganizationRepository => ({
  listAll: async () => orgs,
  findById: async (id) => orgs.find((o) => o.id === id) ?? null,
});

describe('listVisibleOrganizations', () => {
  it.each(['wfc_admin', 'fundraising_consultant'] as const)('shows every organization to %s (AC9)', async (role) => {
    expect(await listVisibleOrganizations(role, undefined, fakeRepo([orgA, orgB]))).toEqual([orgA, orgB]);
  });

  it.each(['org_admin', 'org_staff'] as const)('shows only their own organization to %s (AC10)', async (role) => {
    const repo = fakeRepo([orgA, orgB]);
    expect(await listVisibleOrganizations(role, 'org-a', repo)).toEqual([orgA]);
    expect(await listVisibleOrganizations(role, 'missing', repo)).toEqual([]);
  });
});
