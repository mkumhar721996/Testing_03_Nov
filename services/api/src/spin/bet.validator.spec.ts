import { describe, expect, it } from 'vitest';
import { validateBet } from './bet.validator';

describe('validateBet', () => {
  it('rejects a bet outside the allowed set (AC7-9)', () => {
    expect(validateBet(4, 100)).toEqual({ ok: false, message: expect.any(String) });
    expect(validateBet('5', 100).ok).toBe(false);
  });

  it('rejects a bet above the balance with the same result', () => {
    expect(validateBet(10, 5)).toEqual(validateBet(4, 100));
  });

  it('accepts an allowed bet the balance covers (AC10)', () => {
    expect(validateBet(5, 100)).toEqual({ ok: true });
    expect(validateBet(5, 5)).toEqual({ ok: true });
  });
});
