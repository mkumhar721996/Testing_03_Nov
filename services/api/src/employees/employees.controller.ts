import { Body, Controller, Get, HttpCode, Param, Post, Req, UseGuards } from '@nestjs/common';
import {
  EmployeeService,
  type CreateEmployeeResult,
  type EmployeeSummary,
  type FormOptions,
} from './employee.service';
import { HrGuard, type PrincipalRequest } from './hr.guard';
import { InvitationService, type InvitationView } from './invitation.service';
import type { Principal } from './principal';

// HrGuard has already rejected a request without a principal.
const who = (req: PrincipalRequest) => req.principal as Principal;

@Controller('employees')
@UseGuards(HrGuard)
export class EmployeesController {
  constructor(
    private readonly employees: EmployeeService,
    private readonly invitations: InvitationService,
  ) {}

  @Get('form-options')
  formOptions(@Req() req: PrincipalRequest): Promise<FormOptions> {
    return this.employees.formOptions(who(req));
  }

  @Post()
  create(@Req() req: PrincipalRequest, @Body() body: unknown): Promise<CreateEmployeeResult> {
    return this.employees.create(who(req), body);
  }

  @Get(':id')
  get(@Req() req: PrincipalRequest, @Param('id') id: string): Promise<EmployeeSummary> {
    return this.employees.summary(who(req), id);
  }

  @Get(':id/invitation')
  invitation(@Req() req: PrincipalRequest, @Param('id') id: string): Promise<InvitationView> {
    return this.invitations.getInvitation(who(req), id);
  }

  @Post(':id/invitation')
  @HttpCode(200)
  resend(@Req() req: PrincipalRequest, @Param('id') id: string): Promise<InvitationView> {
    return this.invitations.resend(who(req), id);
  }
}
