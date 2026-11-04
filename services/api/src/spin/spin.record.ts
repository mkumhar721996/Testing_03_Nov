import type { Grid } from './spin.constants';

/** `awarded` is what this spin added; `remaining` is the player's stored counter. */
export interface FreeGamesState {
  awarded: number;
  remaining: number;
}

export interface SpinRecord {
  id: string;
  playerId: string;
  bet: number;
  grid: Grid;
  jackpotTrigger: boolean;
  spunAt: Date;
}
