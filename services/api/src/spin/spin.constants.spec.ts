import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { PAYTABLE_MILLI, REEL_STRIPS } from './spin.constants';

const VALID = new Set(['S1', 'S2', 'S3', 'S4', 'S5', 'S6', 'S7', 'S8', 'S9', 'S10', 'WILD', 'SCATTER']);

describe('tuned game math (AC6)', () => {
  it('has no placeholder marker in the constants source', () => {
    expect(readFileSync(join(__dirname, 'spin.constants.ts'), 'utf8')).not.toMatch(/PLACEHOLDER/);
  });

  it('has one non-empty strip per reel with only valid symbols', () => {
    expect(REEL_STRIPS).toHaveLength(5);
    for (const strip of REEL_STRIPS) {
      expect(strip.length).toBeGreaterThan(0);
      strip.forEach((s) => expect(VALID.has(s)).toBe(true));
    }
  });

  it('pays positive integers increasing with the count', () => {
    for (const p of Object.values(PAYTABLE_MILLI)) {
      for (const n of [3, 4, 5] as const) {
        expect(Number.isInteger(p[n]) && p[n] > 0).toBe(true);
      }
      expect(p[3]).toBeLessThan(p[4]);
      expect(p[4]).toBeLessThan(p[5]);
    }
  });
});
