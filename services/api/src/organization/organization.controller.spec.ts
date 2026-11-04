import { NotFoundException } from '@nestjs/common';
import { afterEach, describe, expect, it, vi } from 'vitest';
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
  afterEach(() => {
    delete process.env.ORGANIZATIONS_API_ENABLED;
  });

  it('returns what the repository lists, in order (AC9)', async () => {
    process.env.ORGANIZATIONS_API_ENABLED = 'true';
    const orgs = [org('a', 'Alpha Org'), org('b', 'Beta Org')];
    expect(await new OrganizationController(fakeRepo(orgs)).list()).toEqual(orgs);
  });

  // No authentication exists yet, so the open endpoint is off unless explicitly enabled.
  it.each([undefined, '', 'false'])('is not served when ORGANIZATIONS_API_ENABLED is %j', async (flag) => {
    if (flag !== undefined) process.env.ORGANIZATIONS_API_ENABLED = flag;
    const repo = { listAll: vi.fn(async () => [org('a', 'Alpha Org')]) };
    await expect(new OrganizationController(repo).list()).rejects.toBeInstanceOf(NotFoundException);
    expect(repo.listAll).not.toHaveBeenCalled();
  });
});
