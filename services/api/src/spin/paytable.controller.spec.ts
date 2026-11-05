import { describe, expect, it } from 'vitest';
import { PaytableController } from './paytable.controller';
import { PAYTABLE_MILLI } from './spin.constants';

describe('PaytableController', () => {
  const view = new PaytableController().paytable();

  it('lists every regular symbol with the evaluator payouts (AC2, AC5)', () => {
    expect(view.symbols).toHaveLength(10);
    for (const { symbol, payouts } of view.symbols) {
      expect(payouts[3]).toBe(PAYTABLE_MILLI[symbol][3] / 1000);
      expect(payouts[4]).toBe(PAYTABLE_MILLI[symbol][4] / 1000);
      expect(payouts[5]).toBe(PAYTABLE_MILLI[symbol][5] / 1000);
    }
    const names: string[] = view.symbols.map((s) => s.symbol);
    expect(names).not.toContain('WILD');
    expect(names).not.toContain('SCATTER');
  });

  it('states the wild and scatter rules (AC3, AC4)', () => {
    expect(view.rules.wild).toMatch(/wild/i);
    expect(view.rules.scatter).toMatch(/scatter/i);
  });
});
