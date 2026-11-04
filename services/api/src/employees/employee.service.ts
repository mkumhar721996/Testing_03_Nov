import { randomUUID } from 'node:crypto';
import { BadRequestException, ConflictException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { STATUS_PENDING_START } from './employee.constants';
import type { EmployeeRecord } from './employee.record';
import { WorkEmailInUseError, type EmployeeRepository } from './employee.repository';
import { validateEmployee } from './employee.validator';
import { CLOCK, EMPLOYEE_REPOSITORY, InvitationService, type InvitationView } from './invitation.service';
import type { OrgOption, OrgStructureReader } from './org-structure.reader';
import type { Principal } from './principal';

export const ORG_STRUCTURE_READER = 'ORG_STRUCTURE_READER';

export interface CreateEmployeeResult {
  employee: EmployeeRecord;
  invitation: InvitationView;
}

export interface FormOptions {
  departments: OrgOption[];
  jobTitles: OrgOption[];
  managers: OrgOption[];
}

export interface EmployeeSummary {
  id: string;
  name: string;
  workEmail: string;
  department: string | null;
  jobTitle: string | null;
  manager: string | null;
  status: string;
}

const nameOf = (options: OrgOption[], id: string | null) => options.find((o) => o.id === id)?.name ?? null;

@Injectable()
export class EmployeeService {
  constructor(
    @Inject(EMPLOYEE_REPOSITORY) private readonly repo: EmployeeRepository,
    @Inject(ORG_STRUCTURE_READER) private readonly org: OrgStructureReader,
    private readonly invitations: InvitationService,
    @Inject(CLOCK) private readonly clock: () => Date,
  ) {}

  async formOptions(principal: Principal): Promise<FormOptions> {
    const [departments, jobTitles, managers] = await Promise.all([
      this.org.departments(principal.tenantId),
      this.org.jobTitles(principal.tenantId),
      this.org.managers(principal.tenantId),
    ]);
    return { departments, jobTitles, managers };
  }

  async create(principal: Principal, input: unknown): Promise<CreateEmployeeResult> {
    const check = validateEmployee(input);
    if (!check.value) throw new BadRequestException({ message: 'Invalid employee', errors: check.errors });
    const v = check.value;

    const options = await this.formOptions(principal);
    const errors: Record<string, string> = {};
    if (!nameOf(options.departments, v.departmentId)) errors.departmentId = 'Choose a department from the list.';
    if (!nameOf(options.jobTitles, v.jobTitleId)) errors.jobTitleId = 'Choose a job title from the list.';
    if (v.managerId && !nameOf(options.managers, v.managerId)) errors.managerId = 'Choose a manager from the list.';
    if (Object.keys(errors).length > 0) throw new BadRequestException({ message: 'Invalid employee', errors });

    const employee: EmployeeRecord = {
      id: randomUUID(),
      tenantId: principal.tenantId,
      ...v,
      status: STATUS_PENDING_START,
      createdAt: this.clock(),
    };
    const { record, token } = this.invitations.issue(principal.tenantId, employee.id);
    try {
      await this.repo.insertWithInvitation(employee, record);
    } catch (err) {
      if (err instanceof WorkEmailInUseError) {
        throw new ConflictException({ code: 'WORK_EMAIL_IN_USE', message: 'This work email is already in use.' });
      }
      throw err;
    }
    // Only after commit: a failing email provider must never undo the employee record.
    const delivered = await this.invitations.deliver(record, employee.workEmail, token);
    return { employee, invitation: this.invitations.view(delivered) };
  }

  async summary(principal: Principal, id: string): Promise<EmployeeSummary> {
    const e = await this.repo.findById(principal.tenantId, id);
    if (!e) throw new NotFoundException('Employee not found');
    const options = await this.formOptions(principal);
    return {
      id: e.id,
      name: `${e.firstName} ${e.lastName}`,
      workEmail: e.workEmail,
      department: nameOf(options.departments, e.departmentId),
      jobTitle: nameOf(options.jobTitles, e.jobTitleId),
      manager: nameOf(options.managers, e.managerId),
      status: e.status,
    };
  }
}
