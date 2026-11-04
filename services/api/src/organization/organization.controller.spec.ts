import { randomUUID } from 'node:crypto';
import { BadRequestException, NotFoundException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { OrganizationController } from './organization.controller';
import type { Organization, OrganizationRepository } from './organization.repository';

function fakeRepo(stored: Organization[] = []): OrganizationRepository {
  return { findById: async (id) => stored.find((o) => o.id === id) ?? null };
}

function organization(id: string, email: string | null, phone: string | null): Organization {
  return {
    id,
    name: 'Alain Leroy Locke College Prep Academy',
    address: '325 E 111th St, Los Angeles CA 90061',
    admin: { name: 'Karishmah', email: 'karishmah@gmail.com' },
    createdBy: 'Daniel Gonzalez Bermudez',
    financeContact: { role: 'Fundraising Consultant', name: 'Morgan Gould', email, phone },
  };
}

describe('OrganizationController', () => {
  it('returns the stored organization with its admin, creator and finance contact (AC1-6)', async () => {
    const id = randomUUID();
    const stored = organization(id, 'mgould@wfchocolate.com', '(555) 218-4400');
    expect(await new OrganizationController(fakeRepo([stored])).get(id)).toEqual(stored);
  });

  it('returns a missing finance email and phone as null (AC12, AC13)', async () => {
    const id = randomUUID();
    const controller = new OrganizationController(fakeRepo([organization(id, null, null)]));
    expect((await controller.get(id)).financeContact).toMatchObject({ email: null, phone: null });
  });

  it('answers an unknown id with 404', async () => {
    await expect(new OrganizationController(fakeRepo()).get(randomUUID())).rejects.toBeInstanceOf(
      NotFoundException,
    );
  });

  it('answers a malformed id with 400', async () => {
    await expect(new OrganizationController(fakeRepo()).get('nope')).rejects.toBeInstanceOf(
      BadRequestException,
    );
  });
});
