import { Controller, Headers, HttpCode, Inject, Post, Res } from '@nestjs/common';
import { readCookie } from './cookie';
import { GuestSessionConfig } from './guest-session.config';
import { GuestSessionService } from './guest-session.service';
import { GUEST_SESSION_CONFIG, GUEST_SESSION_COOKIE, GuestSessionView } from './guest-session.types';

interface CookieResponse {
  cookie(
    name: string,
    value: string,
    options: { httpOnly: boolean; sameSite: 'lax'; path: string; maxAge: number; secure: boolean },
  ): void;
}

@Controller('guest-sessions')
export class GuestSessionController {
  constructor(
    @Inject(GuestSessionService) private readonly service: GuestSessionService,
    @Inject(GUEST_SESSION_CONFIG) private readonly config: GuestSessionConfig,
  ) {}

  @Post()
  async start(
    @Headers('cookie') cookieHeader: string | undefined,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<GuestSessionView> {
    const { session, resumed } = await this.service.startOrResume(
      readCookie(cookieHeader, GUEST_SESSION_COOKIE),
    );
    if (!resumed) {
      res.cookie(GUEST_SESSION_COOKIE, session.id, {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        // express expects milliseconds
        maxAge: this.config.cookieMaxAgeSeconds * 1000,
        secure: process.env.NODE_ENV === 'production',
      });
    }
    return this.service.view(session, resumed);
  }

  @Post('current/top-up')
  @HttpCode(200)
  async topUp(@Headers('cookie') cookieHeader: string | undefined): Promise<GuestSessionView> {
    const session = await this.service.claimTopUp(readCookie(cookieHeader, GUEST_SESSION_COOKIE));
    return this.service.view(session, true);
  }
}
