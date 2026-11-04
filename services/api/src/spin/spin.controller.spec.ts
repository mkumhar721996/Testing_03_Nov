import { BadRequestException } from '@nestjs/common';
import { describe, expect, it } from 'vitest';
import type { Grid } from './spin.constants';
import { SpinController } from './spin.controller';
import { SpinService } from './spin.service';

const GUEST_ID = '6f1c1c0e-5a0e-4a63-9a3b-2f1d7a1e8c11';
const STUB: Grid = [0, 1, 2].map(() => ['S2', 'S3', 'S4', 'S5', 'S6']) as Grid;

function controller(grid: Grid = STUB) {
  const remaining = new Map<string, number>();
  const repo = {
    saveWithJackpot: async (rec: { playerId: string }, _h: unknown, award = 0) => {
      const current = remaining.get(rec.playerId) ?? 0;
      const awarded = current === 0 ? award : 0;
      if (awarded) remaining.set(rec.playerId, awarded);
      return { awarded, remaining: remaining.get(rec.playerId) ?? 0 };
    },
    getFreeGames: async (id: string) => ({ awarded: 0, remaining: remaining.get(id) ?? 0 }),
    findByPlayer: async () => [],
  };
  const policy = { decide: () => ({ pool: 'p', contribution: 0, trigger: false }) };
  return new SpinController(new SpinService(repo, policy, () => grid));
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

  it('returns the award in the spin response and the stored counter on reload (AC5, AC6)', async () => {
    const grid = STUB.map((row) => [...row]) as Grid;
    grid[0][0] = grid[1][1] = grid[2][2] = 'SCATTER';
    const ctl = controller(grid);
    const res = await ctl.spin(GUEST_ID, { bet: 5 });
    expect(res.scatterCount).toBe(3);
    expect(res.freeGames).toEqual({ awarded: 10, remaining: 10 });
    expect(await ctl.freeGames(GUEST_ID)).toEqual({ remaining: 10 });
  });

  it('reports 0 free games for a player with none', async () => {
    expect(await controller().freeGames(GUEST_ID)).toEqual({ remaining: 0 });
  });

  it.each([undefined, 'not-a-uuid'])('rejects free-games guest id %s with 400', async (id) => {
    await expect(controller().freeGames(id)).rejects.toBeInstanceOf(BadRequestException);
  });
});
