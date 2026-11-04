import { type CanActivate, type ExecutionContext, ForbiddenException, Injectable, UnauthorizedException } from '@nestjs/common';
import { HR_ROLE } from './employee.constants';
import type { Principal } from './principal';

export type PrincipalRequest = { principal?: Principal };

/** Reads `request.principal`, set by the Access & app shell epic's authentication. */
@Injectable()
export class HrGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const { principal } = context.switchToHttp().getRequest<PrincipalRequest>();
    if (!principal) throw new UnauthorizedException();
    if (!principal.roles.includes(HR_ROLE)) throw new ForbiddenException();
    return true;
  }
}
