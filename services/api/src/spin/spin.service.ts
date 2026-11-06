import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
import { PLAYER_REPOSITORY, type PlayerRepository } from '../player/player.repository';
import { BET_ERROR, validateBet } from './bet.validator';
import { JackpotPolicy } from './jackpot.handoff';
import type { RandomInt } from './reel.generator';
import type { Grid } from './spin.constants';
import { evaluateSpin, type SpinResult } from './spin.evaluator';
import { InsufficientBalanceError, type SpinRepository } from './spin.repository';

export const SPIN_REPOSITORY = 'SPIN_REPOSITORY';
export const JACKPOT_POLICY = 'JACKPOT_POLICY';
export const GRID_GENERATOR = 'GRID_GENERATOR';

export interface SpinOutcome {
  grid: Grid;
  bet: number;
  evaluation: SpinResult;
  jackpotTrigger: boolean;
  /** Balance after the stake was taken. */
  balance: number;
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
    const current = await this.players.getBalance(playerId);
    const check = validateBet(bet, current);
    if (!check.ok) throw new BadRequestException(check.message);

    const grid = this.generate();
    const handoff = this.policy.decide(grid, bet);
    // Evaluated once so the stored win and the returned win cannot differ.
    const evaluation = evaluateSpin(grid, bet);
    let balance: number;
    try {
      // The stake is taken in the same transaction that stores the spin; no win is credited here.
      balance = await this.repo.saveWithJackpot(
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
    } catch (err) {
      // A concurrent spin used up the balance after the check above.
      if (err instanceof InsufficientBalanceError) throw new BadRequestException(BET_ERROR);
      throw err;
    }
    return { grid, bet, evaluation, jackpotTrigger: handoff.trigger, balance };
  }
}
