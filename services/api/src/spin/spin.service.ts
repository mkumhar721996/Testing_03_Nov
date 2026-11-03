import { randomUUID } from 'node:crypto';
import { BadRequestException, Inject, Injectable } from '@nestjs/common';
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
  ) {}

  /** The grid is generated here only; no client input can reach it. */
  async spin(playerId: string, bet: number): Promise<SpinOutcome> {
    // Balance is out of scope (wallet story); only the allowed bet amounts are checked.
    const check = validateBet(bet, Number.POSITIVE_INFINITY);
    if (!check.ok) throw new BadRequestException(check.message);

    const grid = this.generate();
    const handoff = this.policy.decide(grid, bet);
    await this.repo.saveWithJackpot(
      {
        id: randomUUID(),
        playerId,
        bet,
        grid,
        jackpotTrigger: handoff.trigger,
        spunAt: new Date(),
      },
      handoff,
    );
    return { grid, bet, evaluation: evaluateSpin(grid, bet), jackpotTrigger: handoff.trigger };
  }
}
