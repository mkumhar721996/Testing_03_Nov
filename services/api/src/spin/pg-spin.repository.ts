import type { Pool } from 'pg';
import type { JackpotHandoff } from './jackpot.handoff';
import type { Grid } from './spin.constants';
import { evaluateSpin } from './spin.evaluator';
import type { SpinRecord } from './spin.record';
import type { SpinRepository } from './spin.repository';

interface SpinRow {
  id: string;
  player_id: string;
  bet: string;
  grid: Grid;
  total_win: string | null;
  jackpot_trigger: boolean;
  spun_at: Date;
}

export class PgSpinRepository implements SpinRepository {
  constructor(private readonly pool: Pool) {}

  async saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff): Promise<void> {
    const client = await this.pool.connect();
    try {
      await client.query('BEGIN');
      await client.query(
        `INSERT INTO spin_records (id, player_id, bet, grid, total_win, jackpot_trigger, spun_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)`,
        [
          record.id,
          record.playerId,
          record.bet,
          JSON.stringify(record.grid),
          record.totalWin,
          record.jackpotTrigger,
          record.spunAt,
        ],
      );
      // Single atomic increment; the row lock serialises concurrent spins.
      await client.query('UPDATE jackpot_pools SET amount = amount + $1 WHERE pool = $2', [
        handoff.contribution,
        handoff.pool,
      ]);
      await client.query('COMMIT');
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }

  async findByPlayer(playerId: string): Promise<SpinRecord[]> {
    const { rows } = await this.pool.query<SpinRow>(
      'SELECT * FROM spin_records WHERE player_id = $1 ORDER BY spun_at',
      [playerId],
    );
    return rows.map((r) => ({
      id: r.id,
      playerId: r.player_id,
      bet: Number(r.bet),
      grid: r.grid,
      // Rows from before migration 002 have no stored win; recompute it.
      totalWin:
        r.total_win === null
          ? evaluateSpin(r.grid, Number(r.bet)).totalWin
          : Number(r.total_win),
      jackpotTrigger: r.jackpot_trigger,
      spunAt: r.spun_at,
    }));
  }

  async poolAmount(pool: string): Promise<number> {
    const { rows } = await this.pool.query<{ amount: string }>(
      'SELECT amount FROM jackpot_pools WHERE pool = $1',
      [pool],
    );
    return Number(rows[0]?.amount ?? 0);
  }
}
