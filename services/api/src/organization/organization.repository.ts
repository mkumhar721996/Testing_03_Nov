export interface Organization {
  id: string;
  name: string;
  address: string;
  admin: { name: string; email: string };
  createdBy: string;
  financeContact: { role: string; name: string; email: string | null; phone: string | null };
}

export interface OrganizationRepository {
  /** Returns the organization, or null when no organization has this id. */
  findById(id: string): Promise<Organization | null>;
}

export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');
