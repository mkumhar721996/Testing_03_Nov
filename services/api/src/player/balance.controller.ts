import { Controller, Get, Headers, Inject } from '@nestjs/common';
import { assertGuestId } from './guest-id';
import { PLAYER_REPOSITORY, type PlayerRepository } from './player.repository';

@Controller('balance')
export class BalanceController {
  constructor(@Inject(PLAYER_REPOSITORY) private readonly players: PlayerRepository) {}

  @Get()
  async balance(@Headers('x-guest-id') guestId: string | undefined): Promise<{ balance: number }> {
    return { balance: await this.players.getOrCreateBalance(assertGuestId(guestId)) };
  }
}
