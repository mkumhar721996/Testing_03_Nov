import type { EmployeeRecord, InvitationRecord } from './employee.record';

export class WorkEmailInUseError extends Error {
  constructor() {
    super('Work email is already in use');
  }
}

export interface EmployeeRepository {
  /** Stores both in one transaction; throws WorkEmailInUseError for a duplicate work email in the tenant. */
  insertWithInvitation(e: EmployeeRecord, inv: InvitationRecord): Promise<void>;
  findById(tenantId: string, id: string): Promise<EmployeeRecord | undefined>;
  latestInvitation(tenantId: string, employeeId: string): Promise<InvitationRecord | undefined>;
  /** Revokes the previous invitation and stores the new one. */
  replaceInvitation(tenantId: string, employeeId: string, inv: InvitationRecord): Promise<void>;
  markSent(invitationId: string, sentAt: Date): Promise<void>;
  findInvitationByTokenHash(hash: string): Promise<InvitationRecord | undefined>;
  /** Atomically claims a pending invitation; false when it was already accepted or revoked. */
  markAccepted(invitationId: string, at: Date): Promise<boolean>;
}
