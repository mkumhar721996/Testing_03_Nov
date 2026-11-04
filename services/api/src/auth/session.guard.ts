import {
  type CanActivate,
  type ExecutionContext,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthService } from './auth.service';
import { sessionTokenFrom, type HttpRequest } from './cookies';
import { IS_PUBLIC } from './public.decorator';

/** Global: every route needs a live session unless it is marked `@Public()`. */
@Injectable()
export class SessionGuard implements CanActivate {
  constructor(
    @Inject(Reflector) private readonly reflector: Reflector,
    @Inject(AuthService) private readonly auth: AuthService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC, [
      context.getHandler(),
      context.getClass(),
    ]);
    if (isPublic) return true;
    const req = context.switchToHttp().getRequest<HttpRequest>();
    const user = await this.auth.resolveSession(sessionTokenFrom(req));
    if (!user) throw new UnauthorizedException({ code: 'not_signed_in' });
    req.user = user;
    return true;
  }
}
