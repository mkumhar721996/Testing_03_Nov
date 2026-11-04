import type { Pool } from 'pg';
import type { PlayerRepository } from './player.repository';

export class PgPlayerRepository implements PlayerRepository {
  constructor(private readonly pool: Pool) {}

  async getOrCreateBalance(playerId: string): Promise<number> {
    // Single atomic statement: concurrent first loads cannot create two rows,
    // and an existing balance is never reset (the column default only applies on insert).
    const { rows } = await this.pool.query<{ balance: string }>(
      `INSERT INTO players (id) VALUES ($1)
       ON CONFLICT (id) DO UPDATE SET last_seen_at = now()
       RETURNING balance`,
      [playerId],
    );
    return Number(rows[0].balance);
  }
}
