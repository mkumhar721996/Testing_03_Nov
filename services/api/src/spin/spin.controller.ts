import { BadRequestException, Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { SpinService, type SpinOutcome } from './spin.service';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Only `bet` is read; any other property (e.g. a client grid) is ignored. */
export interface SpinBody {
  bet: number;
}

@Controller('spin')
export class SpinController {
  constructor(private readonly spins: SpinService) {}

  @Post()
  async spin(
    @Headers('x-guest-id') guestId: string | undefined,
    @Body() body: SpinBody,
  ): Promise<SpinOutcome> {
    return this.spins.spin(this.requireGuestId(guestId), body?.bet);
  }

  @Get('free-games')
  async freeGames(@Headers('x-guest-id') guestId: string | undefined): Promise<{ remaining: number }> {
    const { remaining } = await this.spins.freeGames(this.requireGuestId(guestId));
    return { remaining };
  }

  private requireGuestId(guestId: string | undefined): string {
    if (!guestId || !UUID.test(guestId)) {
      throw new BadRequestException('x-guest-id header must be a UUID');
    }
    return guestId;
  }
}
