import type { Grid } from './spin.constants';

export interface SpinRecord {
  id: string;
  playerId: string;
  bet: number;
  grid: Grid;
  totalWin: number;
  jackpotTrigger: boolean;
  spunAt: Date;
}
