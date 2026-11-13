import { CanActivate, ExecutionContext, HttpException, HttpStatus, Injectable } from '@nestjs/common';

export const THROTTLE_LIMIT = 20;
export const THROTTLE_WINDOW_MS = 60 * 1000;

/** Per-IP fixed-window limit for the credential routes (in memory: one counter set per API instance). */
@Injectable()
export class AuthThrottleGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();

  // Plain fields (not constructor params) so Nest's DI has nothing to resolve; tests override them.
  now: () => number = Date.now;
  limit = THROTTLE_LIMIT;
  windowMs = THROTTLE_WINDOW_MS;

  canActivate(context: ExecutionContext): boolean {
    const req = context.switchToHttp().getRequest<{ ip?: string; socket?: { remoteAddress?: string } }>();
    return this.allow(req.ip ?? req.socket?.remoteAddress ?? 'unknown');
  }

  allow(key: string): boolean {
    const now = this.now();
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
    const entry = this.hits.get(key) ?? { count: 0, resetAt: now + this.windowMs };
    entry.count += 1;
    this.hits.set(key, entry);
    if (entry.count > this.limit) {
      throw new HttpException('Too many requests. Try again in a minute.', HttpStatus.TOO_MANY_REQUESTS);
    }
    return true;
  }
}
