import { generateGrid, type RandomInt } from './reel.generator';
import {
  PAYLINES,
  PAYTABLE_MILLI,
  REEL_STRIPS,
  type Grid,
  type Paytable,
  type Symbol,
} from './spin.constants';
import { evaluateSpin } from './spin.evaluator';

type Strips = readonly (readonly Symbol[])[];

export interface RtpReport {
  spins: number;
  paylinesSettled: 10;
  /** Currency units. */
  totalStake: number;
  baseGameWin: number;
  /** No free-game feature exists yet, so this is always 0. */
  freeGameWin: number;
  rtp: number;
}

export interface SimulateRtpOptions {
  spins: number;
  bet: number;
  seed: number;
  strips?: Strips;
  paytable?: Paytable;
}

/** mulberry32: small seedable PRNG, so a simulation is repeatable. */
function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Settles `spins` seeded spins through the production evaluator on all PAYLINES. */
export function simulateRtp(opts: SimulateRtpOptions): RtpReport {
  const { spins, bet, seed, strips = REEL_STRIPS, paytable = PAYTABLE_MILLI } = opts;
  const next = mulberry32(seed);
  const randomInt: RandomInt = (max) => Math.floor(next() * max);

  let winCents = 0;
  for (let i = 0; i < spins; i++) {
    const result = evaluateSpin(generateGrid(randomInt, strips), bet, paytable);
    winCents += Math.round(result.totalWin * 100);
  }

  const totalStake = spins * bet;
  const baseGameWin = winCents / 100;
  const freeGameWin = 0;
  return {
    spins,
    paylinesSettled: PAYLINES.length as 10,
    totalStake,
    baseGameWin,
    freeGameWin,
    rtp: (baseGameWin + freeGameWin) / totalStake,
  };
}

/** Exact base-game RTP by enumerating every stop combination. Tuning aid and cross-check only. */
export function exactBaseGameRtp(strips: Strips, paytable: Paytable): number {
  const bet = PAYLINES.length; // stake of exactly 1.00 per line
  const lengths = strips.map((s) => s.length);
  const combos = lengths.reduce((a, b) => a * b, 1);
  const stops = strips.map(() => 0);
  let win = 0;
  for (let c = 0; c < combos; c++) {
    const grid: Grid = [0, 1, 2].map((row) =>
      strips.map((strip, reel) => strip[(stops[reel] + row) % strip.length]),
    );
    for (const w of evaluateSpin(grid, bet, paytable).wins) win += w.win;
    for (let r = 0; r < stops.length; r++) {
      if (++stops[r] < lengths[r]) break;
      stops[r] = 0;
    }
  }
  return win / (combos * bet);
}
