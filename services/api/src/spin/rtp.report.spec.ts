import { afterEach, describe, expect, it, vi } from 'vitest';
import { formatRtpReport } from './rtp.report';
import { simulateRtp } from './rtp.simulator';
import { PAYLINES } from './spin.constants';
import * as evaluator from './spin.evaluator';

describe('RTP report (AC5)', () => {
  afterEach(() => vi.restoreAllMocks());

  it('states that spins were settled on all 10 fixed paylines', () => {
    const r = simulateRtp({ spins: 1000, bet: 10, seed: 1 });
    expect(r.paylinesSettled).toBe(10);
    expect(formatRtpReport(r)).toMatch(/all 10 fixed paylines/i);
  });

  it('settles every simulated spin through evaluateSpin over all paylines', () => {
    const spy = vi.spyOn(evaluator, 'evaluateSpin');
    simulateRtp({ spins: 50, bet: 10, seed: 1 });
    expect(spy).toHaveBeenCalledTimes(50);
    expect(PAYLINES).toHaveLength(10);
  });
});
