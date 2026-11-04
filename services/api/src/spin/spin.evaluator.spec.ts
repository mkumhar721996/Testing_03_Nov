import { describe, expect, it } from 'vitest';
import { PAYLINES, PAYTABLE_MILLI, TOP_PAYING_SYMBOL, type Grid, type Symbol } from './spin.constants';
import { countScatters, evaluateSpin, freeGamesForScatters, roundHalfUpCents } from './spin.evaluator';

// Scatter filler never pays on a line, so only the lines we set up can win.
function gridWithLines(lines: Record<number, Symbol[]>): Grid {
  const grid: Grid = [0, 1, 2].map(() => Array<Symbol>(5).fill('SCATTER'));
  for (const [index, symbols] of Object.entries(lines)) {
    PAYLINES[Number(index)].forEach((row, reel) => {
      grid[row][reel] = symbols[reel];
    });
  }
  return grid;
}
const gridWithLine = (line: number, symbols: Symbol[]) => gridWithLines({ [line]: symbols });

describe('evaluateSpin', () => {
  it('pays three of a kind (AC1)', () => {
    const r = evaluateSpin(gridWithLine(0, ['S3', 'S3', 'S3', 'S5', 'S6']), 10);
    expect(r.wins).toEqual([{ payline: 0, symbol: 'S3', count: 3, win: PAYTABLE_MILLI.S3[3] / 1000 }]);
  });

  it('pays four of a kind (AC2)', () => {
    expect(evaluateSpin(gridWithLine(0, ['S3', 'S3', 'S3', 'S3', 'S6']), 10).wins[0].win).toBe(
      PAYTABLE_MILLI.S3[4] / 1000,
    );
  });

  it('pays five of a kind (AC3) and only the five amount (AC16)', () => {
    const r = evaluateSpin(gridWithLine(0, ['S3', 'S3', 'S3', 'S3', 'S3']), 10);
    expect(r.wins).toHaveLength(1);
    expect(r.wins[0].count).toBe(5);
    expect(r.wins[0].win).toBe(PAYTABLE_MILLI.S3[5] / 1000);
  });

  it('pays nothing for two of a kind then a different symbol (AC4)', () => {
    expect(evaluateSpin(gridWithLine(0, ['S3', 'S3', 'S4', 'S5', 'S6']), 10).wins).toEqual([]);
  });

  it('lets a wild complete three of a kind (AC5)', () => {
    expect(evaluateSpin(gridWithLine(0, ['S3', 'S3', 'WILD', 'S5', 'S6']), 10).wins[0]).toMatchObject({
      symbol: 'S3',
      count: 3,
    });
  });

  it('pays two winning paylines and sums them (AC6)', () => {
    const r = evaluateSpin(
      gridWithLines({ 0: ['S3', 'S3', 'S3', 'S5', 'S6'], 1: ['S4', 'S4', 'S4', 'S4', 'S6'] }),
      10,
    );
    expect(r.wins.map((w) => w.payline)).toEqual([0, 1]);
    expect(r.totalWin).toBeCloseTo(r.wins[0].win + r.wins[1].win, 2);
  });

  it('rounds the total once, not per payline', () => {
    const line: Symbol[] = ['S10', 'S10', 'S10', 'S5', 'S6'];
    expect(PAYTABLE_MILLI.S10[3]).toBe(50);
    const r = evaluateSpin(gridWithLines({ 1: line, 2: line }), 1);
    expect(r.wins.map((w) => w.win)).toEqual([0.005, 0.005]);
    expect(r.totalWin).toBe(0.01);
  });

  it('pays five wilds as five of the top symbol (AC11)', () => {
    expect(evaluateSpin(gridWithLine(0, Array<Symbol>(5).fill('WILD')), 10).wins[0]).toMatchObject({
      symbol: TOP_PAYING_SYMBOL,
      count: 5,
      win: PAYTABLE_MILLI[TOP_PAYING_SYMBOL][5] / 1000,
    });
  });

  it('does not substitute a wild for scatter (AC12)', () => {
    expect(evaluateSpin(gridWithLine(0, ['SCATTER', 'SCATTER', 'WILD', 'S5', 'S6']), 10).wins).toEqual([]);
  });

  it('pays nothing for three scatters and no wild (AC13)', () => {
    const grid: Grid = [
      ['SCATTER', 'S1', 'S2', 'S3', 'S4'],
      ['S5', 'SCATTER', 'S6', 'S7', 'S8'],
      ['S9', 'S10', 'SCATTER', 'S1', 'S2'],
    ];
    expect(evaluateSpin(grid, 10).totalWin).toBe(0);
  });

  it('stakes bet / 10 per payline (AC14)', () => {
    expect(evaluateSpin(gridWithLine(0, ['S3', 'S4', 'S5', 'S6', 'S7']), 10).stakePerLine).toBe(1);
  });

  it('pays nothing for a run on reels 2-4 only (AC17)', () => {
    expect(evaluateSpin(gridWithLine(0, ['S5', 'S3', 'S3', 'S3', 'S6']), 10).wins).toEqual([]);
  });

  it('takes the better reading of leading wilds', () => {
    const r = evaluateSpin(gridWithLine(0, ['WILD', 'WILD', 'WILD', 'S10', 'S6']), 10);
    expect(r.wins[0]).toMatchObject({ symbol: TOP_PAYING_SYMBOL, count: 3 });
  });
});

describe('roundHalfUpCents', () => {
  it('rounds 1.125 up to 1.13 (AC15)', () => {
    expect(roundHalfUpCents(112500)).toBe(1.13);
  });
});

describe('free games for scatters', () => {
  it.each([
    [3, 10],
    [4, 15],
    [5, 20],
    [2, 0],
    [0, 0],
  ])('%i scatters award %i free games (AC1-AC4)', (n, award) => {
    expect(freeGamesForScatters(n)).toBe(award);
  });

  it('counts scatters anywhere on the grid, not only on paylines', () => {
    const grid: Grid = [0, 1, 2].map(() => Array<Symbol>(5).fill('S1'));
    grid[0][0] = 'SCATTER';
    grid[2][1] = 'SCATTER';
    grid[1][4] = 'SCATTER';
    expect(countScatters(grid)).toBe(3);
  });
});
