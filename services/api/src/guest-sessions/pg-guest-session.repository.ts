import { randomUUID } from 'node:crypto';
import type { Pool } from 'pg';
import { GuestSession, GuestSessionRepository } from './guest-session.types';

interface Row {
  id: string;
  balance: number;
  created_at: Date;
}

const toSession = (row: Row): GuestSession => ({
  id: row.id,
  balance: row.balance,
  createdAt: row.created_at,
});

export class PgGuestSessionRepository implements GuestSessionRepository {
  constructor(private readonly pool: Pick<Pool, 'query'>) {}

  async create(startingBalance: number): Promise<GuestSession> {
    const { rows } = await this.pool.query<Row>(
      'INSERT INTO guest_sessions (id, balance) VALUES ($1, $2) RETURNING id, balance, created_at',
      [randomUUID(), startingBalance],
    );
    return toSession(rows[0]);
  }

  async find(id: string): Promise<GuestSession | null> {
    const { rows } = await this.pool.query<Row>(
      'SELECT id, balance, created_at FROM guest_sessions WHERE id = $1',
      [id],
    );
    return rows[0] ? toSession(rows[0]) : null;
  }

  async claimTopUp(id: string, startingBalance: number): Promise<GuestSession | null> {
    const { rows } = await this.pool.query<Row>(
      `UPDATE guest_sessions SET balance = $2, updated_at = now()
       WHERE id = $1 AND balance < 1 RETURNING id, balance, created_at`,
      [id, startingBalance],
    );
    return rows[0] ? toSession(rows[0]) : null;
  }

  async deleteExpired(maxAgeSeconds: number): Promise<number> {
    const result = await this.pool.query(
      "DELETE FROM guest_sessions WHERE created_at < now() - ($1 * interval '1 second')",
      [maxAgeSeconds],
    );
    return result.rowCount ?? 0;
  }
}
