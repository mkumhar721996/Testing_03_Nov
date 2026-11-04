export type RegularSymbol = 'S1' | 'S2' | 'S3' | 'S4' | 'S5' | 'S6' | 'S7' | 'S8' | 'S9' | 'S10';
export type Symbol = RegularSymbol | 'WILD' | 'SCATTER';
/** Grid[row 0..2][reel 0..4] */
export type Grid = Symbol[][];

// Provisional pending game designer confirmation: standard 10-payline layout (row index per reel).
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

export type Paytable = Record<RegularSymbol, Record<3 | 4 | 5, number>>;

/**
 * Multipliers of the per-payline stake, in thousandths, for 3, 4 or 5 matching symbols.
 * Tuned together with REEL_STRIPS so the exact base-game return to player is 96.00%
 * (checked by `exactBaseGameRtp` and the 10M-spin simulation in rtp.simulator.spec.ts).
 * Re-run those checks after changing any value here or on a strip.
 */
export const PAYTABLE_MILLI: Paytable = {
  S1: { 3: 20170, 4: 60509, 5: 201695 },
  S2: { 3: 15127, 4: 45381, 5: 151271 },
  S3: { 3: 10085, 4: 30254, 5: 100848 },
  S4: { 3: 8068, 4: 24203, 5: 80678 },
  S5: { 3: 5042, 4: 15127, 5: 50424 },
  S6: { 3: 4034, 4: 12102, 5: 40339 },
  S7: { 3: 3025, 4: 9076, 5: 30254 },
  S8: { 3: 2017, 4: 6051, 5: 20170 },
  S9: { 3: 2017, 4: 6051, 5: 20170 },
  S10: { 3: 1008, 4: 3025, 5: 10085 },
};

/** Builds a reel strip from symbol weights: a symbol's weight is how many strip positions it fills. */
const strip = (weights: Partial<Record<Symbol, number>>): Symbol[] =>
  Object.entries(weights).flatMap(([symbol, weight]) => Array<Symbol>(weight).fill(symbol as Symbol));

/** One strip per reel (reel 1 first); reels may differ. Each strip has 20 positions. */
export const REEL_STRIPS: readonly (readonly Symbol[])[] = [
  strip({ S1: 1, S2: 1, S3: 1, S4: 1, S5: 2, S6: 2, S7: 2, S8: 2, S9: 2, S10: 2, WILD: 3, SCATTER: 1 }),
  strip({ S1: 1, S2: 1, S3: 1, S4: 1, S5: 2, S6: 2, S7: 2, S8: 2, S9: 2, S10: 2, WILD: 3, SCATTER: 1 }),
  strip({ S1: 1, S2: 1, S3: 1, S4: 1, S5: 2, S6: 2, S7: 2, S8: 2, S9: 2, S10: 2, WILD: 3, SCATTER: 1 }),
  strip({ S1: 1, S2: 1, S3: 1, S4: 1, S5: 2, S6: 2, S7: 2, S8: 2, S9: 2, S10: 2, WILD: 3, SCATTER: 1 }),
  strip({ S1: 1, S2: 1, S3: 1, S4: 1, S5: 2, S6: 2, S7: 2, S8: 2, S9: 2, S10: 2, WILD: 3, SCATTER: 1 }),
];

export const TOP_PAYING_SYMBOL: RegularSymbol = 'S1';

export const ALLOWED_BETS = [1, 2, 3, 5, 10] as const;
