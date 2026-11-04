import { Controller, Get, Inject, NotFoundException } from '@nestjs/common';
import { ORGANIZATION_REPOSITORY, type Organization, type OrganizationRepository } from './organization.repository';

@Controller('organizations')
export class OrganizationController {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository) {}

  // No authentication or tenant scoping exists yet, and this returns admin contact details,
  // so the route answers 404 unless ORGANIZATIONS_API_ENABLED=true. Remove once auth lands.
  @Get()
  async list(): Promise<Organization[]> {
    if (process.env.ORGANIZATIONS_API_ENABLED !== 'true') throw new NotFoundException();
    return this.organizations.listAll();
  }
}
