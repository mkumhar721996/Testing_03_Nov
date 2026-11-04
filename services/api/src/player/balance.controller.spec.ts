import { randomUUID } from 'node:crypto';
import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import { BalanceController } from './balance.controller';
import { STARTING_BALANCE } from './player.constants';
import type { PlayerRepository } from './player.repository';

function fakeRepo(stored: Record<string, number> = {}): PlayerRepository {
  return {
    getBalance: async (id) => stored[id] ?? STARTING_BALANCE,
  };
}

describe('BalanceController', () => {
  it('gives a first-time player the starting balance of 100 (AC1)', async () => {
    const controller = new BalanceController(fakeRepo());
    expect(await controller.balance(randomUUID())).toEqual({ balance: 100 });
  });

  it('returns the stored server balance (AC2, AC3, AC4)', async () => {
    const id = randomUUID();
    const controller = new BalanceController(fakeRepo({ [id]: 37 }));
    expect(await controller.balance(id)).toEqual({ balance: 37 });
  });

  it('gives a new guest id 100 even when another id holds 37 (AC5)', async () => {
    const controller = new BalanceController(fakeRepo({ [randomUUID()]: 37 }));
    expect(await controller.balance(randomUUID())).toEqual({ balance: 100 });
  });

  it.each([undefined, 'not-a-uuid'])('rejects guest id %s with 400', async (id) => {
    const err = await new BalanceController(fakeRepo()).balance(id).catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
  });
});
