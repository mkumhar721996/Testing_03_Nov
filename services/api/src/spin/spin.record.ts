import type { Grid } from './spin.constants';

export interface SpinRecord {
  id: string;
  playerId: string;
  bet: number;
  grid: Grid;
  jackpotTrigger: boolean;
  spunAt: Date;
}
