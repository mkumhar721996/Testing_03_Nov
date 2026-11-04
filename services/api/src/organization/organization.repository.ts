export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');

export type OrgRole = 'wfc_admin' | 'fundraising_consultant' | 'org_admin' | 'org_staff';

export interface Organization {
  id: string;
  name: string;
  type: string | null;
  street: string | null;
  city: string | null;
  region: string | null;
  postalCode: string | null;
  country: string | null;
  adminName: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  createdByName: string | null;
  createdAt: string | null;
}

export interface OrganizationRepository {
  listAll(): Promise<Organization[]>;
  findById(id: string): Promise<Organization | null>;
}
