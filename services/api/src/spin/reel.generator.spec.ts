import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it, vi } from 'vitest';
import { generateGrid } from './reel.generator';
import { REEL_STRIPS } from './spin.constants';

const VALID = new Set(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'WILD', 'SCATTER']);

describe('generateGrid', () => {
  it('builds a 3x5 grid', () => {
    const grid = generateGrid(() => 0);
    expect(grid).toHaveLength(3);
    grid.forEach((row) => expect(row).toHaveLength(5));
  });

  it('draws one stop per reel over the strip length, with valid symbols', () => {
    const spy = vi.fn(() => 0);
    const grid = generateGrid(spy);
    expect(spy).toHaveBeenCalledTimes(5);
    REEL_STRIPS.forEach((strip, i) => expect(spy).toHaveBeenNthCalledWith(i + 1, strip.length));
    grid.flat().forEach((s) => expect(VALID.has(s)).toBe(true));
  });

  it('takes 3 consecutive wrapping positions from the stop', () => {
    const grid = generateGrid((n) => n - 1);
    REEL_STRIPS.forEach((strip, reel) => {
      const n = strip.length;
      expect([0, 1, 2].map((row) => grid[row][reel])).toEqual([
        strip[n - 1],
        strip[0],
        strip[1],
      ]);
    });
  });

  it('uses crypto.randomInt, not Math.random', () => {
    const src = readFileSync(join(__dirname, 'reel.generator.ts'), 'utf8');
    expect(src).toContain('randomInt');
    expect(src).not.toContain('Math.random');
  });
});
