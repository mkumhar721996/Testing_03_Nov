import { randomUUID } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { Pool } from 'pg';
import { afterAll, beforeAll, describe, expect, it } from 'vitest';
import type { EmployeeRecord, InvitationRecord } from './employee.record';
import { WorkEmailInUseError } from './employee.repository';
import { PgEmployeeRepository } from './pg-employee.repository';

const url = process.env.TEST_DATABASE_URL;

const employee = (tenantId: string, workEmail: string): EmployeeRecord => ({
  id: randomUUID(),
  tenantId,
  firstName: 'Maria',
  lastName: 'Okafor',
  personalEmail: null,
  phone: null,
  workEmail,
  departmentId: randomUUID(),
  jobTitleId: randomUUID(),
  managerId: null,
  status: 'pending_start',
  createdAt: new Date(),
});

const invitation = (e: EmployeeRecord): InvitationRecord => ({
  id: randomUUID(),
  tenantId: e.tenantId,
  employeeId: e.id,
  tokenHash: randomUUID(),
  createdAt: new Date(),
  sentAt: null,
  acceptedAt: null,
  revokedAt: null,
});

describe.skipIf(!url)('PgEmployeeRepository (set TEST_DATABASE_URL to run)', () => {
  let pool: Pool;
  let repo: PgEmployeeRepository;
  const migration = (name: string) => readFileSync(join(__dirname, '../../migrations', name), 'utf8');

  beforeAll(async () => {
    pool = new Pool({ connectionString: url });
    await pool.query(migration('001_spin_records.sql'));
    await pool.query(migration('002_employees.sql'));
    await pool.query(migration('002_employees.sql')); // idempotent
    repo = new PgEmployeeRepository(pool);
  });
  afterAll(async () => {
    await pool?.end();
  });

  it('rejects the same work email in one tenant, case-insensitively, but not across tenants (AC4)', async () => {
    const tenant = randomUUID();
    const first = employee(tenant, 'x@acme.com');
    await repo.insertWithInvitation(first, invitation(first));
    const dup = employee(tenant, 'X@Acme.com');
    await expect(repo.insertWithInvitation(dup, invitation(dup))).rejects.toBeInstanceOf(WorkEmailInUseError);
    const other = employee(randomUUID(), 'x@acme.com');
    await expect(repo.insertWithInvitation(other, invitation(other))).resolves.toBeUndefined();
  });

  it('replaces an invitation, revoking the previous one, and scopes reads by tenant', async () => {
    const tenant = randomUUID();
    const e = employee(tenant, `${randomUUID()}@acme.com`);
    const first = invitation(e);
    await repo.insertWithInvitation(e, first);
    const next = { ...invitation(e), createdAt: new Date(Date.now() + 1000) };
    await repo.replaceInvitation(tenant, e.id, next);
    expect((await repo.latestInvitation(tenant, e.id))?.id).toBe(next.id);
    expect((await repo.findInvitationByTokenHash(first.tokenHash))?.revokedAt).not.toBeNull();
    expect(await repo.findById(randomUUID(), e.id)).toBeUndefined();
    await repo.markSent(next.id, new Date());
    expect((await repo.latestInvitation(tenant, e.id))?.sentAt).not.toBeNull();
  });
});
