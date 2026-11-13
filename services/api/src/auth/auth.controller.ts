import { Body, Controller, ForbiddenException, Get, Headers, HttpCode, Post, Res } from '@nestjs/common';
import { SESSION_COOKIE } from './auth.constants';
import { AuthService, type SessionUser } from './auth.service';
import { readCookie, setCookieOptions, type CookieOptions } from './session.cookie';

/** Only `email` and `password` are read; any other property (e.g. a client-sent role) is ignored. */
export interface CredentialsBody {
  email: string;
  password: string;
}

/** The slice of the Express response this controller uses. */
export interface CookieResponse {
  cookie(name: string, value: string, options: CookieOptions): unknown;
  clearCookie(name: string, options: Omit<CookieOptions, 'maxAge'>): unknown;
}

/**
 * The session cookie is sent cross-site in production, so state-changing routes need a header
 * a foreign page cannot add without CORS (which only allows WEB_ORIGIN).
 */
function requireCsrfHeader(value: string | undefined) {
  if (!value) throw new ForbiddenException('x-requested-with header is required');
}

@Controller('auth')
export class AuthController {
  constructor(private readonly auth: AuthService) {}

  @Post('register')
  async register(
    @Body() body: CredentialsBody,
    @Headers('x-requested-with') requestedWith: string | undefined,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<SessionUser> {
    requireCsrfHeader(requestedWith);
    const { token, user } = await this.auth.register(body?.email, body?.password);
    res.cookie(SESSION_COOKIE, token, setCookieOptions(process.env.NODE_ENV));
    return user;
  }

  @Post('sign-in')
  @HttpCode(200)
  async signIn(
    @Body() body: CredentialsBody,
    @Headers('x-requested-with') requestedWith: string | undefined,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<SessionUser> {
    requireCsrfHeader(requestedWith);
    const { token, user } = await this.auth.signIn(body?.email, body?.password);
    res.cookie(SESSION_COOKIE, token, setCookieOptions(process.env.NODE_ENV));
    return user;
  }

  @Post('sign-out')
  @HttpCode(204)
  async signOut(
    @Headers('x-requested-with') requestedWith: string | undefined,
    @Headers('cookie') cookie: string | undefined,
    @Res({ passthrough: true }) res: CookieResponse,
  ): Promise<void> {
    requireCsrfHeader(requestedWith);
    await this.auth.signOut(readCookie(cookie, SESSION_COOKIE));
    const { maxAge: _maxAge, ...options } = setCookieOptions(process.env.NODE_ENV);
    res.clearCookie(SESSION_COOKIE, options);
  }

  @Get('session')
  session(@Headers('cookie') cookie: string | undefined): Promise<SessionUser> {
    return this.auth.sessionFor(readCookie(cookie, SESSION_COOKIE));
  }
}
