export type RegularSymbol = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10';
export type Symbol = RegularSymbol | 'WILD' | 'SCATTER';
/** Grid[row 0..2][reel 0..4] */
export type Grid = Symbol[][];

// PLACEHOLDER: standard 10-payline layout (row index per reel). The game designer must confirm.
export const PAYLINES: readonly (readonly [number, number, number, number, number])[] = [
  [1, 1, 1, 1, 1],
  [0, 0, 0, 0, 0],
  [2, 2, 2, 2, 2],
  [0, 1, 2, 1, 0],
  [2, 1, 0, 1, 2],
  [0, 0, 1, 2, 2],
  [2, 2, 1, 0, 0],
  [1, 0, 1, 0, 1],
  [1, 2, 1, 2, 1],
  [0, 1, 1, 1, 0],
];

// PLACEHOLDER: multipliers of the per-payline stake, in thousandths. The game math owner must
// supply the final values and unit.
export const PAYTABLE_MILLI: Record<RegularSymbol, Record<3 | 4 | 5, number>> = {
  S1: { 3: 5000, 4: 20000, 5: 100000 },
  S2: { 3: 4000, 4: 15000, 5: 75000 },
  S3: { 3: 3000, 4: 10000, 5: 50000 },
  S4: { 3: 2000, 4: 7500, 5: 30000 },
  S5: { 3: 1500, 4: 5000, 5: 20000 },
  S6: { 3: 1000, 4: 3000, 5: 15000 },
  S7: { 3: 750, 4: 2000, 5: 10000 },
  S8: { 3: 500, 4: 1500, 5: 7500 },
  S9: { 3: 250, 4: 1000, 5: 5000 },
  S10: { 3: 50, 4: 500, 5: 2500 },
};

export const TOP_PAYING_SYMBOL: RegularSymbol = 'S1';

export const ALLOWED_BETS = [1, 2, 3, 5, 10] as const;
