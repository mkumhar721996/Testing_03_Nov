import { randomInt as cryptoRandomInt } from 'node:crypto';
import { REEL_STRIPS, type Grid } from './spin.constants';

export type RandomInt = (maxExclusive: number) => number;

const ROWS = 3;

/** Draws each reel's stop from a CSPRNG; each reel shows 3 consecutive (wrapping) strip positions. */
export function generateGrid(randomInt: RandomInt = cryptoRandomInt): Grid {
  const grid: Grid = Array.from({ length: ROWS }, () => []);
  for (const strip of REEL_STRIPS) {
    const stop = randomInt(strip.length);
    for (let row = 0; row < ROWS; row++) {
      grid[row].push(strip[(stop + row) % strip.length]);
    }
  }
  return grid;
}
