import { ALLOWED_BETS } from './spin.constants';

export type BetCheck = { ok: true } | { ok: false; message: string };

const BET_ERROR = `Bet must be one of ${ALLOWED_BETS.join(', ')} and not above your balance.`;

export function validateBet(bet: unknown, balance: number): BetCheck {
  const allowed = (ALLOWED_BETS as readonly unknown[]).includes(bet);
  if (!allowed || (bet as number) > balance) {
    return { ok: false, message: BET_ERROR };
  }
  return { ok: true };
}
