import type { Pool } from 'pg';
import { STARTING_BALANCE } from './player.constants';
import type { PlayerRepository } from './player.repository';

export class PgPlayerRepository implements PlayerRepository {
  constructor(private readonly pool: Pool) {}

  async getBalance(playerId: string): Promise<number> {
    // Read-only: unauthenticated callers must not be able to create rows by asking.
    const { rows } = await this.pool.query<{ balance: string }>(
      'SELECT balance FROM players WHERE id = $1',
      [playerId],
    );
    return rows.length ? Number(rows[0].balance) : STARTING_BALANCE;
  }
}
