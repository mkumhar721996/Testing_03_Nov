import { randomInt as cryptoRandomInt } from 'node:crypto';
import { REEL_STRIPS, type Grid, type Symbol } from './spin.constants';

export type RandomInt = (maxExclusive: number) => number;

const ROWS = 3;

/** Draws each reel's stop from a CSPRNG; each reel shows 3 consecutive (wrapping) strip positions. */
export function generateGrid(
  randomInt: RandomInt = cryptoRandomInt,
  strips: readonly (readonly Symbol[])[] = REEL_STRIPS,
): Grid {
  const grid: Grid = Array.from({ length: ROWS }, () => []);
  for (const strip of strips) {
    const stop = randomInt(strip.length);
    for (let row = 0; row < ROWS; row++) {
      grid[row].push(strip[(stop + row) % strip.length]);
    }
  }
  return grid;
}
