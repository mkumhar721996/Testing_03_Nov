import type { EmployeeRecord, InvitationRecord } from './employee.record';
import { WorkEmailInUseError, type EmployeeRepository } from './employee.repository';
import { InvitationService } from './invitation.service';
import { EmployeeService } from './employee.service';
import type { InvitationSender } from './invitation.sender';
import type { OrgStructureReader } from './org-structure.reader';
import type { Principal } from './principal';

/** In-memory test doubles shared by the employees specs. Tenant filtering mirrors the Pg adapter. */
export class FakeEmployeeRepository implements EmployeeRepository {
  employees: EmployeeRecord[] = [];
  invitations: InvitationRecord[] = [];

  async insertWithInvitation(e: EmployeeRecord, inv: InvitationRecord) {
    const email = e.workEmail.toLowerCase();
    if (this.employees.some((x) => x.tenantId === e.tenantId && x.workEmail.toLowerCase() === email)) {
      throw new WorkEmailInUseError();
    }
    this.employees.push({ ...e });
    this.invitations.push({ ...inv });
  }

  async findById(tenantId: string, id: string) {
    return this.employees.find((e) => e.tenantId === tenantId && e.id === id);
  }

  async latestInvitation(tenantId: string, employeeId: string) {
    const all = this.invitations.filter((i) => i.tenantId === tenantId && i.employeeId === employeeId);
    return all.at(-1);
  }

  async replaceInvitation(tenantId: string, employeeId: string, inv: InvitationRecord) {
    for (const i of this.invitations) {
      if (i.tenantId === tenantId && i.employeeId === employeeId && !i.revokedAt) i.revokedAt = inv.createdAt;
    }
    this.invitations.push({ ...inv });
  }

  async markSent(id: string, sentAt: Date) {
    const inv = this.invitations.find((i) => i.id === id);
    if (inv) inv.sentAt = sentAt;
  }

  async findInvitationByTokenHash(hash: string) {
    return this.invitations.find((i) => i.tokenHash === hash);
  }

  async markAccepted(id: string, at: Date) {
    const inv = this.invitations.find((i) => i.id === id);
    if (inv) inv.acceptedAt = at;
  }
}

export class FakeSender implements InvitationSender {
  sent: { to: string; acceptUrl: string }[] = [];
  fail = false;

  async send(to: string, acceptUrl: string) {
    if (this.fail) throw new Error('smtp down');
    this.sent.push({ to, acceptUrl });
  }
}

export class FakeClock {
  constructor(public current = new Date('2026-10-21T09:00:00Z')) {}
  now = () => this.current;
  set(d: Date) {
    this.current = d;
  }
}

export const DEPT = { id: 'dept-1', name: 'Engineering' };
export const TITLE = { id: 'title-1', name: 'Software Engineer' };
export const MGR = { id: 'mgr-1', name: 'Sam Lee' };

export const fakeOrg: OrgStructureReader = {
  departments: async () => [DEPT],
  jobTitles: async () => [TITLE],
  managers: async () => [MGR],
};

export const hr: Principal = { userId: 'u-hr', tenantId: 'tenant-a', roles: ['HR'] };

export const valid = (over: Record<string, unknown> = {}) => ({
  firstName: 'Maria',
  lastName: 'Okafor',
  personalEmail: 'maria.okafor@example.com',
  phone: '+44 20 7946 0000',
  workEmail: 'maria.okafor@acme.com',
  departmentId: DEPT.id,
  jobTitleId: TITLE.id,
  managerId: MGR.id,
  ...over,
});

export function setup(sender: InvitationSender = new FakeSender()) {
  const repo = new FakeEmployeeRepository();
  const clock = new FakeClock();
  const invitations = new InvitationService(repo, sender, clock.now, undefined, 'http://app.test');
  const service = new EmployeeService(repo, fakeOrg, invitations, clock.now);
  return { repo, clock, sender, invitations, service };
}

export const tokenFromUrl = (url: string) => new URL(url.replace('/#', '')).searchParams.get('token') ?? '';
