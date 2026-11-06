import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import type {
  Job,
  NewTechnician,
  ProfileInput,
  Technician,
  TechnicianProfile,
  TechnicianSummary,
  WorkingDay,
} from './technician.model';
import { DuplicateEmailError, type TechnicianRepository } from './technician.repository';

const UNIQUE_VIOLATION = '23505';

const TECH_COLUMNS = `id, name, login_email AS "loginEmail", phone, service_area AS "serviceArea", notes, active`;
const JOB_COLUMNS = `id, title, customer, to_char(scheduled_date, 'YYYY-MM-DD') AS "scheduledDate",
  to_char(scheduled_time, 'HH24:MI') AS "scheduledTime", technician_id AS "technicianId", status`;
const OPEN = `status NOT IN ('completed', 'cancelled')`;

export class PgTechnicianRepository implements TechnicianRepository {
  constructor(private readonly pool: Pool) {}

  async create(t: NewTechnician): Promise<Technician> {
    try {
      const { rows } = await this.pool.query<Technician>(
        `INSERT INTO technicians (id, name, login_email, phone, service_area, notes)
         VALUES ($1, $2, $3, $4, $5, $6) RETURNING ${TECH_COLUMNS}`,
        [randomUUID(), t.name, t.loginEmail, t.phone ?? null, t.serviceArea ?? null, t.notes ?? null],
      );
      return rows[0];
    } catch (e) {
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) throw new DuplicateEmailError();
      throw e;
    }
  }

  async list(filter?: { active?: boolean }): Promise<TechnicianSummary[]> {
    const { rows } = await this.pool.query<TechnicianSummary>(
      `SELECT t.id, t.name, t.login_email AS "loginEmail", t.phone, t.service_area AS "serviceArea", t.notes, t.active,
         COALESCE((SELECT array_agg(weekday ORDER BY weekday) FROM technician_working_hours w WHERE w.technician_id = t.id), '{}') AS "workingDays",
         (SELECT count(*)::int FROM jobs j WHERE j.technician_id = t.id AND j.${OPEN}) AS "openJobCount",
         (SELECT to_char(min(day), 'YYYY-MM-DD') FROM technician_days_off d WHERE d.technician_id = t.id AND d.day >= current_date) AS "nextDayOff"
       FROM technicians t
       WHERE ($1::boolean IS NULL OR t.active = $1)
       ORDER BY lower(t.name)`,
      [filter?.active ?? null],
    );
    return rows;
  }

  async get(id: string): Promise<TechnicianProfile | null> {
    const { rows } = await this.pool.query<Technician>(`SELECT ${TECH_COLUMNS} FROM technicians WHERE id = $1`, [id]);
    if (!rows.length) return null;
    const hours = await this.pool.query<WorkingDay>(
      `SELECT weekday, to_char(start_time, 'HH24:MI') AS start, to_char(end_time, 'HH24:MI') AS "end"
       FROM technician_working_hours WHERE technician_id = $1 ORDER BY weekday`,
      [id],
    );
    const off = await this.pool.query<{ day: string }>(
      `SELECT to_char(day, 'YYYY-MM-DD') AS day FROM technician_days_off WHERE technician_id = $1 ORDER BY day`,
      [id],
    );
    return { ...rows[0], workingHours: hours.rows, daysOff: off.rows.map((r) => r.day) };
  }

  async updateProfile(id: string, p: ProfileInput): Promise<Technician | null> {
    try {
      const { rows } = await this.pool.query<Technician>(
        `UPDATE technicians SET
           name = COALESCE($2, name),
           login_email = COALESCE($3, login_email),
           phone = CASE WHEN $4::boolean THEN $5 ELSE phone END,
           service_area = CASE WHEN $6::boolean THEN $7 ELSE service_area END,
           notes = CASE WHEN $8::boolean THEN $9 ELSE notes END
         WHERE id = $1 RETURNING ${TECH_COLUMNS}`,
        [
          id,
          p.name ?? null,
          p.loginEmail ?? null,
          p.phone !== undefined,
          p.phone ?? null,
          p.serviceArea !== undefined,
          p.serviceArea ?? null,
          p.notes !== undefined,
          p.notes ?? null,
        ],
      );
      return rows[0] ?? null;
    } catch (e) {
      if ((e as { code?: string }).code === UNIQUE_VIOLATION) throw new DuplicateEmailError();
      throw e;
    }
  }

  async replaceWeeklyHours(id: string, days: WorkingDay[]): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query('DELETE FROM technician_working_hours WHERE technician_id = $1', [id]);
      for (const d of days) {
        await client.query(
          'INSERT INTO technician_working_hours (technician_id, weekday, start_time, end_time) VALUES ($1, $2, $3, $4)',
          [id, d.weekday, d.start, d.end],
        );
      }
      await client.query('COMMIT');
    } catch (e) {
      await client.query('ROLLBACK');
      throw e;
    } finally {
      client.release();
    }
  }

  async addDayOff(id: string, day: string): Promise<void> {
    await this.pool.query(
      'INSERT INTO technician_days_off (technician_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING',
      [id, day],
    );
  }

  async removeDayOff(id: string, day: string): Promise<void> {
    await this.pool.query('DELETE FROM technician_days_off WHERE technician_id = $1 AND day = $2', [id, day]);
  }

  async setActive(id: string, active: boolean): Promise<Technician | null> {
    // Only the technician row changes: jobs they hold stay assigned to them.
    const { rows } = await this.pool.query<Technician>(
      `UPDATE technicians SET active = $2 WHERE id = $1 RETURNING ${TECH_COLUMNS}`,
      [id, active],
    );
    return rows[0] ?? null;
  }

  async listAssignable(): Promise<Technician[]> {
    const { rows } = await this.pool.query<Technician>(
      `SELECT ${TECH_COLUMNS} FROM technicians WHERE active ORDER BY lower(name)`,
    );
    return rows;
  }

  async jobsHeldBy(id: string, onDate?: string): Promise<Job[]> {
    const { rows } = await this.pool.query<Job>(
      `SELECT ${JOB_COLUMNS} FROM jobs
       WHERE technician_id = $1 AND ($2::date IS NULL OR scheduled_date = $2::date)
       ORDER BY scheduled_date, scheduled_time, id`,
      [id, onDate ?? null],
    );
    return rows;
  }

  async reassignJob(jobId: string, technicianId: string): Promise<Job | null> {
    const { rows } = await this.pool.query<Job>(
      `UPDATE jobs SET technician_id = $2 WHERE id = $1 RETURNING ${JOB_COLUMNS}`,
      [jobId, technicianId],
    );
    return rows[0] ?? null;
  }
}
