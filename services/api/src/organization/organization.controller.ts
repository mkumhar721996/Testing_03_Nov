import { Controller, Get, Inject } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY, type Organization, type OrganizationRepository } from './organization.repository';

@Controller('organizations')
export class OrganizationController {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository) {}

  // No authentication exists yet, so like /balance and /spin this takes no identity and does no scoping.
  @Get()
  list(): Promise<Organization[]> {
    return this.organizations.listAll();
  }
}
