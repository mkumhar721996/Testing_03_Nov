import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';

/**
 * Stand-in until the auth story lands: trusts the `x-user-role` header, so it is NOT real security.
 * Replace the body of canActivate with a check of the signed-in user's role.
 */
@Injectable()
export class AdminGuard implements CanActivate {
  canActivate(ctx: ExecutionContext): boolean {
    const req = ctx.switchToHttp().getRequest<{ headers: Record<string, string | undefined> }>();
    if (req.headers['x-user-role'] !== 'admin') {
      throw new ForbiddenException('Only an admin can manage technicians');
    }
    return true;
  }
}
