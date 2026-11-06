import type { JackpotHandoff } from './jackpot.handoff';
import type { SpinRecord } from './spin.record';

/** The player's balance cannot cover the bet at the moment of the debit. */
export class InsufficientBalanceError extends Error {}

export interface SpinRepository {
  /**
   * Takes the stake, stores the record and counts the handoff in the shared pools, all or nothing.
   * Resolves to the balance after the debit.
   */
  saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff): Promise<number>;
  findByPlayer(playerId: string): Promise<SpinRecord[]>;
}
