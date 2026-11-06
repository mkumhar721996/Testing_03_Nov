import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/** Set to "true" in local development only; without it every technician route is refused. */
export const INSECURE_ADMIN_HEADER_FLAG = 'ALLOW_INSECURE_ADMIN_HEADER';

/**
 * Stand-in until the auth story lands. It fails closed: the role is only read from the spoofable
 * `x-user-role` header when the server was started with ALLOW_INSECURE_ADMIN_HEADER=true (never in production).
 * Replace the body of canActivate with a check of a verified session's role.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    const trusted = process.env[INSECURE_ADMIN_HEADER_FLAG] === 'true';
    if (!trusted || req.headers['x-user-role'] !== 'admin') {
      throw new ForbiddenException('Only an admin can manage technicians');
    }
    return true;
  }
}
