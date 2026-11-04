import type { Pool } from 'pg';
import type { OrgOption, OrgStructureReader } from './org-structure.reader';

/**
 * Reads the Organization structure epic's tables. The table names are assumed until that epic lands;
 * no such data exists yet, so the lists are empty in a real deployment.
 */
export class PgOrgStructureReader implements OrgStructureReader {
  constructor(private readonly pool: Pool) {}

  departments(tenantId: string) {
    return this.names('departments', tenantId);
  }

  jobTitles(tenantId: string) {
    return this.names('job_titles', tenantId);
  }

  async managers(tenantId: string): Promise<OrgOption[]> {
    const { rows } = await this.pool.query<OrgOption>(
      `SELECT id, first_name || ' ' || last_name AS name FROM employees
       WHERE tenant_id = $1 ORDER BY first_name, last_name`,
      [tenantId],
    );
    return rows;
  }

  private async names(table: 'departments' | 'job_titles', tenantId: string): Promise<OrgOption[]> {
    const { rows } = await this.pool.query<OrgOption>(
      `SELECT id, name FROM ${table} WHERE tenant_id = $1 ORDER BY name`,
      [tenantId],
    );
    return rows;
  }
}
