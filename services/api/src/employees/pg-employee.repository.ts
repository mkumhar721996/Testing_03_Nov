import type { Pool } from 'pg';
import type { EmployeeRecord, InvitationRecord } from './employee.record';
import { WorkEmailInUseError, type EmployeeRepository } from './employee.repository';

interface EmployeeRow {
  id: string;
  tenant_id: string;
  first_name: string;
  last_name: string;
  personal_email: string | null;
  phone: string | null;
  work_email: string;
  department_id: string;
  job_title_id: string;
  manager_id: string | null;
  status: string;
  created_at: Date;
}

interface InvitationRow {
  id: string;
  tenant_id: string;
  employee_id: string;
  token_hash: string;
  created_at: Date;
  sent_at: Date | null;
  accepted_at: Date | null;
  revoked_at: Date | null;
}

const toEmployee = (r: EmployeeRow): EmployeeRecord => ({
  id: r.id,
  tenantId: r.tenant_id,
  firstName: r.first_name,
  lastName: r.last_name,
  personalEmail: r.personal_email,
  phone: r.phone,
  workEmail: r.work_email,
  departmentId: r.department_id,
  jobTitleId: r.job_title_id,
  managerId: r.manager_id,
  status: r.status,
  createdAt: r.created_at,
});

const toInvitation = (r: InvitationRow): InvitationRecord => ({
  id: r.id,
  tenantId: r.tenant_id,
  employeeId: r.employee_id,
  tokenHash: r.token_hash,
  createdAt: r.created_at,
  sentAt: r.sent_at,
  acceptedAt: r.accepted_at,
  revokedAt: r.revoked_at,
});

const INSERT_INVITATION = `INSERT INTO employee_invitations (id, tenant_id, employee_id, token_hash, created_at)
  VALUES ($1, $2, $3, $4, $5)`;

const invitationParams = (i: InvitationRecord) => [i.id, i.tenantId, i.employeeId, i.tokenHash, i.createdAt];

export class PgEmployeeRepository implements EmployeeRepository {
  constructor(private readonly pool: Pool) {}

  async insertWithInvitation(e: EmployeeRecord, inv: InvitationRecord): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO employees (id, tenant_id, first_name, last_name, personal_email, phone, work_email,
           department_id, job_title_id, manager_id, status, created_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12)`,
        [
          e.id,
          e.tenantId,
          e.firstName,
          e.lastName,
          e.personalEmail,
          e.phone,
          e.workEmail,
          e.departmentId,
          e.jobTitleId,
          e.managerId,
          e.status,
          e.createdAt,
        ],
      );
      await client.query(INSERT_INVITATION, invitationParams(inv));
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      const pg = err as { code?: string; constraint?: string };
      if (pg.code === '23505' && pg.constraint === 'employees_work_email_uq') throw new WorkEmailInUseError();
      throw err;
    } finally {
      client.release();
    }
  }

  async findById(tenantId: string, id: string): Promise<EmployeeRecord | undefined> {
    const { rows } = await this.pool.query<EmployeeRow>(
      'SELECT * FROM employees WHERE tenant_id = $1 AND id = $2',
      [tenantId, id],
    );
    return rows[0] && toEmployee(rows[0]);
  }

  async latestInvitation(tenantId: string, employeeId: string): Promise<InvitationRecord | undefined> {
    const { rows } = await this.pool.query<InvitationRow>(
      `SELECT * FROM employee_invitations WHERE tenant_id = $1 AND employee_id = $2
       ORDER BY created_at DESC LIMIT 1`,
      [tenantId, employeeId],
    );
    return rows[0] && toInvitation(rows[0]);
  }

  async replaceInvitation(tenantId: string, employeeId: string, inv: InvitationRecord): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `UPDATE employee_invitations SET revoked_at = $3
         WHERE tenant_id = $1 AND employee_id = $2 AND revoked_at IS NULL`,
        [tenantId, employeeId, inv.createdAt],
      );
      await client.query(INSERT_INVITATION, invitationParams(inv));
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async markSent(invitationId: string, sentAt: Date): Promise<void> {
    await this.pool.query('UPDATE employee_invitations SET sent_at = $2 WHERE id = $1', [invitationId, sentAt]);
  }

  async findInvitationByTokenHash(hash: string): Promise<InvitationRecord | undefined> {
    const { rows } = await this.pool.query<InvitationRow>(
      'SELECT * FROM employee_invitations WHERE token_hash = $1',
      [hash],
    );
    return rows[0] && toInvitation(rows[0]);
  }

  async markAccepted(invitationId: string, at: Date): Promise<boolean> {
    const res = await this.pool.query(
      'UPDATE employee_invitations SET accepted_at = $2 WHERE id = $1 AND accepted_at IS NULL AND revoked_at IS NULL RETURNING id',
      [invitationId, at],
    );
    return (res.rowCount ?? 0) > 0;
  }
}
