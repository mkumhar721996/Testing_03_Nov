import {
  PAYLINES,
  PAYTABLE_MILLI,
  TOP_PAYING_SYMBOL,
  type Grid,
  type RegularSymbol,
  type Symbol,
} from './spin.constants';

export interface PaylineWin {
  payline: number;
  symbol: RegularSymbol;
  count: 3 | 4 | 5;
  win: number;
}

export interface SpinResult {
  stakePerLine: number;
  wins: PaylineWin[];
  totalWin: number;
}

const LINE_COUNT = PAYLINES.length;
const MILLI_CENTS_PER_UNIT = 100000;

/** Takes an exact amount in thousandths of a cent; returns currency units rounded half-up to cents. */
export function roundHalfUpCents(exactMilliCents: number): number {
  return Math.floor((exactMilliCents + 500) / 1000) / 100;
}

function runLength(line: Symbol[], base: RegularSymbol): number {
  let count = 0;
  while (count < line.length && (line[count] === base || line[count] === 'WILD')) count++;
  return count;
}

/** Best exact payout (thousandths of a cent) for one payline, or null when it does not pay. */
function evaluateLine(line: Symbol[], stakeCents: number) {
  if (line[0] === 'SCATTER') return null;

  const candidates = new Set<RegularSymbol>();
  if (line[0] === 'WILD') candidates.add(TOP_PAYING_SYMBOL);
  const firstNonWild = line.find((s) => s !== 'WILD');
  if (firstNonWild && firstNonWild !== 'SCATTER') candidates.add(firstNonWild);

  let best: { symbol: RegularSymbol; count: 3 | 4 | 5; exact: number } | null = null;
  for (const symbol of candidates) {
    const count = runLength(line, symbol);
    if (count < 3) continue;
    const exact = stakeCents * PAYTABLE_MILLI[symbol][count as 3 | 4 | 5];
    if (!best || exact > best.exact) best = { symbol, count: count as 3 | 4 | 5, exact };
  }
  return best;
}

export function evaluateSpin(grid: Grid, bet: number): SpinResult {
  const stakeCents = Math.round((bet * 100) / LINE_COUNT);
  const wins: PaylineWin[] = [];
  let totalExact = 0;

  PAYLINES.forEach((rows, payline) => {
    const line = rows.map((row, reel) => grid[row][reel]);
    const hit = evaluateLine(line, stakeCents);
    if (!hit) return;
    totalExact += hit.exact;
    wins.push({ payline, symbol: hit.symbol, count: hit.count, win: hit.exact / MILLI_CENTS_PER_UNIT });
  });

  return { stakePerLine: stakeCents / 100, wins, totalWin: roundHalfUpCents(totalExact) };
}
