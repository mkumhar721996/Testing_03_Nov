import { Controller, Get } from '@nestjs/common';
import { PAYTABLE_MILLI, type RegularSymbol } from './spin.constants';

export interface PaytableView {
  /** Payouts are multiples of the per-payline stake. */
  symbols: { symbol: RegularSymbol; payouts: { 3: number; 4: number; 5: number } }[];
  rules: { wild: string; scatter: string };
}

// These describe only what spin.evaluator.ts does today.
const WILD_RULE =
  'Wild substitutes for every regular symbol. A line that starts with Wild pays as the top-paying symbol.';
const SCATTER_RULE = 'Scatter never substitutes for another symbol and does not start or extend a payline.';

@Controller('paytable')
export class PaytableController {
  @Get()
  paytable(): PaytableView {
    return {
      symbols: (Object.keys(PAYTABLE_MILLI) as RegularSymbol[]).map((symbol) => ({
        symbol,
        payouts: {
          3: PAYTABLE_MILLI[symbol][3] / 1000,
          4: PAYTABLE_MILLI[symbol][4] / 1000,
          5: PAYTABLE_MILLI[symbol][5] / 1000,
        },
      })),
      rules: { wild: WILD_RULE, scatter: SCATTER_RULE },
    };
  }
}
