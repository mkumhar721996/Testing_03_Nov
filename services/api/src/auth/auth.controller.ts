import { Body, Controller, Get, Headers, HttpCode, Inject, Post } from '@nestjs/common';
import { AuthService, type AuthResult, type SessionUser } from './auth.service';

interface Credentials {
  email?: unknown;
  password?: unknown;
}

export function bearerToken(header: string | undefined): string | undefined {
  const match = /^Bearer\s+(\S+)$/i.exec(header ?? '');
  return match?.[1];
}

@Controller('auth')
export class AuthController {
  constructor(@Inject(AuthService) private readonly auth: AuthService) {}

  // Only email and password are read: a client-sent role is ignored (customers only self-register).
  @Post('register')
  register(@Body() body: Credentials): Promise<AuthResult> {
    return this.auth.register(body?.email, body?.password);
  }

  @Post('sign-in')
  @HttpCode(200)
  signIn(@Body() body: Credentials): Promise<AuthResult> {
    return this.auth.signIn(body?.email, body?.password);
  }

  @Post('sign-out')
  @HttpCode(204)
  async signOut(@Headers('authorization') authorization: string | undefined): Promise<void> {
    const token = bearerToken(authorization);
    if (token) await this.auth.signOut(token);
  }

  @Get('session')
  session(@Headers('authorization') authorization: string | undefined): Promise<SessionUser> {
    return this.auth.sessionFor(bearerToken(authorization));
  }
}
