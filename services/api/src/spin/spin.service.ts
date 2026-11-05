import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable, NotFoundException } from '@nestjs/common';
import { PLAYER_REPOSITORY, type PlayerRepository } from '../player/player.repository';
import { validateBet } from './bet.validator';
import { JackpotPolicy } from './jackpot.handoff';
import type { RandomInt } from './reel.generator';
import type { Grid } from './spin.constants';
import { evaluateSpin, type SpinResult } from './spin.evaluator';
import type { SpinRepository } from './spin.repository';

export const SPIN_REPOSITORY = 'SPIN_REPOSITORY';
export const JACKPOT_POLICY = 'JACKPOT_POLICY';
export const GRID_GENERATOR = 'GRID_GENERATOR';

export interface SpinOutcome {
  grid: Grid;
  bet: number;
  evaluation: SpinResult;
  jackpotTrigger: boolean;
}

@Injectable()
export class SpinService {
  constructor(
    @Inject(SPIN_REPOSITORY) private readonly repo: SpinRepository,
    @Inject(JACKPOT_POLICY) private readonly policy: JackpotPolicy,
    @Inject(GRID_GENERATOR) private readonly generate: (randomInt?: RandomInt) => Grid,
    @Inject(PLAYER_REPOSITORY) private readonly players: PlayerRepository,
  ) {}

  /** The grid is generated here only; no client input can reach it. */
  async spin(playerId: string, bet: number): Promise<SpinOutcome> {
    // Read only: the debit belongs to the wallet story.
    const balance = await this.players.getBalance(playerId);
    const check = validateBet(bet, balance);
    if (!check.ok) throw new BadRequestException(check.message);

    const grid = this.generate();
    const handoff = this.policy.decide(grid, bet);
    // Evaluated once so the stored win and the returned win cannot differ.
    const evaluation = evaluateSpin(grid, bet);
    await this.repo.saveWithJackpot(
      {
        id: randomUUID(),
        playerId,
        bet,
        grid,
        totalWin: evaluation.totalWin,
        jackpotTrigger: handoff.trigger,
        spunAt: new Date(),
      },
      handoff,
    );
    return { grid, bet, evaluation, jackpotTrigger: handoff.trigger };
  }

  /** The player's most recent spin, so a reloaded client can learn a result it lost. */
  async latest(playerId: string): Promise<SpinOutcome & { spunAt: Date }> {
    const records = await this.repo.findByPlayer(playerId);
    const last = records[records.length - 1];
    if (!last) throw new NotFoundException('No spins yet');
    return {
      grid: last.grid,
      bet: last.bet,
      evaluation: evaluateSpin(last.grid, last.bet),
      jackpotTrigger: last.jackpotTrigger,
      spunAt: last.spunAt,
    };
  }
}
