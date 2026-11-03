import type { Grid } from './spin.constants';

export interface JackpotHandoff {
  pool: string;
  contribution: number;
  trigger: boolean;
}

export interface JackpotPolicy {
  decide(grid: Grid, bet: number): JackpotHandoff;
}

// PLACEHOLDER: the Progressive Jackpot epic replaces this. Pool name, rate and trigger await the
// product owner; no pool is credited and nothing triggers until then.
export const PLACEHOLDER_JACKPOT_POLICY: JackpotPolicy = {
  decide: () => ({ pool: 'placeholder', contribution: 0, trigger: false }),
};
