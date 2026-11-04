import type { Organization } from './organizationApi'

export const makeOrg = (overrides: Partial<Organization> = {}): Organization => ({
  id: 'org-1',
  name: 'Alpha Org',
  type: 'Youth services',
  reference: 'ORG-1',
  phone: '(206) 555-0114',
  street: '12 Main St',
  street2: 'Suite 2',
  city: 'Seattle',
  state: 'WA',
  postalCode: '98101',
  adminName: 'Dana Whitfield',
  adminEmail: 'dana@example.test',
  adminPhone: '(206) 555-0150',
  createdByName: 'Marcus Lee',
  createdByRole: 'WFC Admin',
  createdAt: '2026-01-02T03:04:05.000Z',
  ...overrides,
})
