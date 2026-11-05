import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { PlayerRepository } from '../player/player.repository';
import type { Grid } from './spin.constants';
import { SpinController } from './spin.controller';
import { SpinService } from './spin.service';

const GUEST_ID = '6f1c1c0e-5a0e-4a63-9a3b-2f1d7a1e8c11';
const STUB: Grid = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6']) as Grid;

function controller(balance = 100) {
  const repo = { saveWithJackpot: async () => undefined, findByPlayer: async () => [] };
  const policy = { decide: () => ({ pool: 'p', contribution: 0, trigger: false }) };
  return new SpinController(new SpinService(repo, policy, () => STUB, { getBalance: async () => balance } as PlayerRepository));
}

describe('SpinController', () => {
  it('returns the server-generated grid, ignoring a client grid', async () => {
    const clientGrid = [0, 1, 2].map(() => Array(5).fill('S1'));
    const body = { bet: 5, grid: clientGrid } as { bet: number };
    const res = await controller().spin(GUEST_ID, body);
    expect(res.grid).toEqual(STUB);
  });

  it.each([undefined, 'not-a-uuid'])('rejects guest id %s with 400', async (id) => {
    const err = await controller()
      .spin(id, { bet: 5 })
      .catch((e: unknown) => e);
    expect(err).toBeInstanceOf(BadRequestException);
    expect((err as BadRequestException).getStatus()).toBe(400);
  });

  it('rejects a disallowed bet with 400', async () => {
    const err = await controller()
      .spin(GUEST_ID, { bet: 7 })
      .catch((e: unknown) => e);
    expect((err as BadRequestException).getStatus()).toBe(400);
  });

  it('rejects a bet above the balance with 400 (AC10)', async () => {
    const err = await controller(7)
      .spin(GUEST_ID, { bet: 10 })
      .catch((e: unknown) => e);
    expect((err as BadRequestException).getStatus()).toBe(400);
  });
});
