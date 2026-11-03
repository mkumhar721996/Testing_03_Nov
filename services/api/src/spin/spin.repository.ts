import type { JackpotHandoff } from './jackpot.handoff';
import type { SpinRecord } from './spin.record';

export interface SpinRepository {
  /** Stores the record and counts the handoff in the shared pools, all or nothing. */
  saveWithJackpot(record: SpinRecord, handoff: JackpotHandoff): Promise<void>;
  findByPlayer(playerId: string): Promise<SpinRecord[]>;
}
