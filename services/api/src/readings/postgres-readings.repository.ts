import type { Pool } from 'pg';
import type { NewReading, ReadingsRepository, StoredReading } from './readings.repository';

interface ReadingRow {
  id: string;
  tenant_id: string;
  patient_id: string;
  client_request_id: string;
  type: string;
  values: Record<string, number>;
  reading_date: string;
  note: string | null;
  created_at: Date;
  inserted: boolean;
}

/** Postgres adapter; the schema is in migrations/001-readings.sql. */
export class PostgresReadingsRepository implements ReadingsRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async create(r: NewReading): Promise<{ reading: StoredReading; created: boolean }> {
    // The no-op DO UPDATE makes a replay return the existing row; xmax = 0 only for a fresh insert.
    const { rows } = await this.pool.query<ReadingRow>(
      `INSERT INTO readings (tenant_id, patient_id, client_request_id, type, values, reading_date, note)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       ON CONFLICT (tenant_id, patient_id, client_request_id)
       DO UPDATE SET client_request_id = EXCLUDED.client_request_id
       RETURNING id, tenant_id, patient_id, client_request_id, type, values,
                 to_char(reading_date, 'YYYY-MM-DD') AS reading_date, note, created_at,
                 (xmax = 0) AS inserted`,
      [r.tenantId, r.patientId, r.clientRequestId, r.type, JSON.stringify(r.values), r.date, r.note ?? null],
    );
    const row = rows[0];
    return {
      created: row.inserted,
      reading: {
        id: row.id,
        tenantId: row.tenant_id,
        patientId: row.patient_id,
        clientRequestId: row.client_request_id,
        type: row.type,
        values: row.values,
        date: row.reading_date,
        note: row.note ?? undefined,
        createdAt: row.created_at,
      },
    };
  }
}
