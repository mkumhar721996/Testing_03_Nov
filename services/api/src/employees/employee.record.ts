export interface EmployeeRecord {
  id: string;
  tenantId: string;
  firstName: string;
  lastName: string;
  personalEmail: string | null;
  phone: string | null;
  workEmail: string;
  departmentId: string;
  jobTitleId: string;
  managerId: string | null;
  status: string;
  createdAt: Date;
}

export interface InvitationRecord {
  id: string;
  tenantId: string;
  employeeId: string;
  /** Only the SHA-256 of the token is stored. */
  tokenHash: string;
  createdAt: Date;
  /** null until the email was handed to the provider successfully. */
  sentAt: Date | null;
  acceptedAt: Date | null;
  revokedAt: Date | null;
}
