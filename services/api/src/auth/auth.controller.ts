import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpException,
  Inject,
  Logger,
  Param,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { AuthService } from './auth.service';
import type { SessionUser } from './auth.repository';
import {
  clearSessionCookie,
  sessionTokenFrom,
  setSessionCookie,
  type HttpRequest,
  type HttpResponse,
} from './cookies';
import { Public } from './public.decorator';
import { RateLimiter } from './rate-limiter';

const str = (v: unknown): string => (typeof v === 'string' ? v : '');

@Controller('auth')
export class AuthController {
  private readonly logger = new Logger(AuthController.name);
  private readonly resetByIp = new RateLimiter(20, 3_600_000);

  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  @Public()
  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body() body: { email?: unknown; password?: unknown },
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<SessionUser> {
    const result = await this.auth.signIn(str(body?.email), str(body?.password));
    if (result.kind === 'locked') throw new HttpException({ code: 'account_locked' }, 423);
    if (result.kind === 'invalid') throw new UnauthorizedException({ code: 'invalid_credentials' });
    setSessionCookie(res, result.sessionToken, result.expiresAt);
    return result.user;
  }

  @Post('sign-out')
  @HttpCode(204)
  async signOut(
    @Req() req: HttpRequest,
    @Res({ passthrough: true }) res: HttpResponse,
  ): Promise<void> {
    await this.auth.signOut(sessionTokenFrom(req));
    clearSessionCookie(res);
  }

  @Get('session')
  session(@Req() req: HttpRequest): SessionUser {
    return req.user as SessionUser;
  }

  @Public()
  @Post('password-reset/request')
  @HttpCode(202)
  requestReset(@Body() body: { email?: unknown }, @Req() req: HttpRequest): { status: string } {
    if (!this.resetByIp.allow(req.ip ?? 'unknown', Date.now())) {
      throw new HttpException({ code: 'too_many_requests' }, 429);
    }
    // Not awaited: both branches must answer at the same speed (AC13).
    this.auth.requestReset(str(body?.email)).catch((err) => {
      this.logger.error(`Password reset request failed: ${String(err)}`);
    });
    return { status: 'accepted' };
  }

  @Public()
  @Get('password-reset/:token')
  @HttpCode(204)
  async checkReset(@Param('token') token: string): Promise<void> {
    if (!(await this.auth.checkResetToken(token))) {
      throw new HttpException({ code: 'invalid_link' }, 410);
    }
  }

  @Public()
  @Post('password-reset/confirm')
  @HttpCode(204)
  async confirmReset(@Body() body: { token?: unknown; password?: unknown }): Promise<void> {
    const result = await this.auth.confirmReset(str(body?.token), str(body?.password));
    if (result === 'invalid-link') throw new HttpException({ code: 'invalid_link' }, 410);
    if (result === 'weak-password') throw new HttpException({ code: 'weak_password' }, 422);
  }
}
