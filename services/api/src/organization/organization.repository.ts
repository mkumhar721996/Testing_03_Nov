export const ORGANIZATION_REPOSITORY = Symbol('ORGANIZATION_REPOSITORY');

export interface Organization {
  id: string;
  name: string;
  type: string | null;
  reference: string | null;
  phone: string | null;
  street: string | null;
  street2: string | null;
  city: string | null;
  state: string | null;
  postalCode: string | null;
  adminName: string | null;
  adminEmail: string | null;
  adminPhone: string | null;
  createdByName: string | null;
  createdByRole: string | null;
  createdAt: string;
}

export interface OrganizationRepository {
  /** Returns every organization ordered by name. Never writes. */
  listAll(): Promise<Organization[]>;
}
