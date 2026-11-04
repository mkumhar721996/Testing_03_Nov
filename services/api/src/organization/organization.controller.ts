import { BadRequestException, Controller, Get, Inject, NotFoundException, Param } from '@nestjs/common';
import {
  ORGANIZATION_REPOSITORY,
  type Organization,
  type OrganizationRepository,
} from './organization.repository';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Controller('organizations')
export class OrganizationController {
  constructor(@Inject(ORGANIZATION_REPOSITORY) private readonly organizations: OrganizationRepository) {}

  @Get(':id')
  async get(@Param('id') id: string): Promise<Organization> {
    if (!UUID.test(id)) {
      throw new BadRequestException('organization id must be a UUID');
    }
    const organization = await this.organizations.findById(id);
    if (!organization) {
      throw new NotFoundException('organization not found');
    }
    return organization;
  }
}
