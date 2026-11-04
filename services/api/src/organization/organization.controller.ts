import {
  BadRequestException,
  Controller,
  ForbiddenException,
  Get,
  Headers,
  Inject,
  NotFoundException,
} from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type Organization,
  type OrganizationRepository,
  type OrgRole,
} from './organization.repository';
import { listVisibleOrganizations } from './organization.visibility';

const ROLES: readonly string[] = ['wfc_admin', 'fundraising_consultant', 'org_admin', 'org_staff'];

@Controller('organizations')
export class OrganizationController {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository) {}

  // Identity comes from client-controlled headers as a stand-in until the authentication story lands, so
  // it is NOT access control: the route answers 404 unless ORGANIZATIONS_TRUST_IDENTITY_HEADERS=true,
  // which must stay off wherever the API is reachable by untrusted callers.
  @Get()
  async list(
    @Headers('x-user-role') role: string | undefined,
    @Headers('x-organization-id') organizationId: string | undefined,
  ): Promise<Organization[]> {
    if (process.env.ORGANIZATIONS_TRUST_IDENTITY_HEADERS !== 'true') throw new NotFoundException();
    if (!role) throw new BadRequestException('x-user-role header is required');
    if (!ROLES.includes(role)) throw new ForbiddenException('Unknown role');
    const orgRole = role as OrgRole;
    if ((orgRole === 'org_admin' || orgRole === 'org_staff') && !organizationId) {
      throw new BadRequestException('x-organization-id header is required for this role');
    }
    return listVisibleOrganizations(orgRole, organizationId, this.organizations);
  }
}
