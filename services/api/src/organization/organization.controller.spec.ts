import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { OrganizationController } from './organization.controller';
import type { Organization, OrganizationRepository } from './organization.repository';

const org = (id: string): Organization => ({
  id,
  name: id,
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

const orgs = [org('org-a'), org('org-b')];
const repo: OrganizationRepository = {
  listAll: async () => orgs,
  findById: async (id) => orgs.find((o) => o.id === id) ?? null,
};

describe('OrganizationController', () => {
  const controller = new OrganizationController(repo);

  it('returns every organization to a WFC Admin (AC9)', async () => {
    expect(await controller.list('wfc_admin', undefined)).toEqual(orgs);
  });

  it('returns only their own organization to Org Staff (AC10)', async () => {
    expect(await controller.list('org_staff', 'org-a')).toEqual([orgs[0]]);
  });

  it('rejects a missing role, or an org role with no organization id, with 400', async () => {
    await expect(controller.list(undefined, undefined)).rejects.toBeInstanceOf(BadRequestException);
    await expect(controller.list('org_admin', undefined)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('rejects an unknown role with 403', async () => {
    await expect(controller.list('guest', 'org-a')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
