import type { JackpotHandoff } from './jackpot.handoff';
import type { FreeGamesState, SpinRecord } from './spin.record';

export interface SpinRepository {
  /**
   * Stores the record, counts the handoff in the shared pools and records the free-game award,
   * all or nothing. An award is ignored while free games are already in progress.
   */
  saveWithJackpot(
    record: SpinRecord,
    handoff: JackpotHandoff,
    freeGamesAward?: number,
  ): Promise<FreeGamesState>;
  /** `awarded` is always 0 here; a player with no stored state has 0 remaining. */
  getFreeGames(playerId: string): Promise<FreeGamesState>;
  findByPlayer(playerId: string): Promise<SpinRecord[]>;
}
