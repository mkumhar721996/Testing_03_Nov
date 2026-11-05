import { Body, Controller, Get, Headers, Post } from '@nestjs/common';
import { assertGuestId } from '../player/guest-id';
import { SpinService, type SpinOutcome } from './spin.service';

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
    return this.spins.spin(assertGuestId(guestId), body?.bet);
  }

  @Get('latest')
  async latest(
    @Headers('x-guest-id') guestId: string | undefined,
  ): Promise<SpinOutcome & { spunAt: Date }> {
    return this.spins.latest(assertGuestId(guestId));
  }
}
