import type { Organization, OrganizationRepository, OrgRole } from './organization.repository';

/** WFC Admin and Fundraising Consultant see every organization; Org Admin and Org Staff only their own. */
export async function listVisibleOrganizations(
  role: OrgRole,
  organizationId: string | undefined,
  repo: OrganizationRepository,
): Promise<Organization[]> {
  if (role === 'wfc_admin' || role === 'fundraising_consultant') return repo.listAll();
  if (!organizationId) return [];
  const own = await repo.findById(organizationId);
  return own ? [own] : [];
}
