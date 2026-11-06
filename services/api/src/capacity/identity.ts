// TEMPORARY stand-in until SSO sign-in lands (ADR-0012); replace this module only.
// It trusts the x-user-id and x-user-role headers, so anyone can claim admin until then.
import { ForbiddenException, UnauthorizedException, createParamDecorator, type ExecutionContext } from '@nestjs/common';

export interface Identity {
  userId: string;
  role: 'admin' | 'customer';
}

/**
 * Throws 401 when the user id is missing or the role is unknown.
 * Headers are unverified, so they are refused unless ALLOW_INSECURE_HEADER_IDENTITY=true
 * (development and tests only; never set it where the API is reachable by untrusted callers).
 */
export function identityFromHeaders(userId?: string, role?: string): Identity {
  if (process.env.ALLOW_INSECURE_HEADER_IDENTITY !== 'true') {
    throw new UnauthorizedException('Sign in to continue.');
  }
  if (!userId || (role !== 'admin' && role !== 'customer')) {
    throw new UnauthorizedException('Sign in to continue.');
  }
  return { userId, role };
}

/** Throws 403 unless the identity is an admin. */
export function assertAdmin(identity: Identity): void {
  if (identity?.role !== 'admin') {
    throw new ForbiddenException('Only admins can do this.');
  }
}

/** Controller parameter: the identity resolved from the request headers. */
export const CurrentIdentity = createParamDecorator((_data: unknown, ctx: ExecutionContext): Identity => {
  const headers = ctx.switchToHttp().getRequest().headers as Record<string, string | undefined>;
  return identityFromHeaders(headers['x-user-id'], headers['x-user-role']);
});
