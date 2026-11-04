import { describe, expect, it } from 'vitest';
import { exactBaseGameRtp, simulateRtp } from './rtp.simulator';
import { PAYTABLE_MILLI, REEL_STRIPS } from './spin.constants';

describe('return to player (AC1)', () => {
  it(
    'has an exact base-game RTP within 0.02pp of 96%',
    () => {
      expect(Math.abs(exactBaseGameRtp(REEL_STRIPS, PAYTABLE_MILLI) - 0.96)).toBeLessThanOrEqual(0.0002);
    },
    120_000,
  );

  it.each([1, 2])(
    'simulates 10 million spins within 0.1pp of 96% (seed %i)',
    async (seed) => {
      // The simulation is synchronous; yield first so the worker can flush pending
      // task updates to the vitest main process (else onTaskUpdate RPC times out).
      await new Promise((resolve) => setImmediate(resolve));
      const r =simulateRtp({ spins: 10_000_000, bet: 10, seed });
      expect(r.spins).toBe(10_000_000);
      expect(Math.abs(r.rtp - 0.96)).toBeLessThanOrEqual(0.001);
      expect(r.baseGameWin + r.freeGameWin).toBeCloseTo(r.rtp * r.totalStake, 2);
    },
    120_000,
  );
});
