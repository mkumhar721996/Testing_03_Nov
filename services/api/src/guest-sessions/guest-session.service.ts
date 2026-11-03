import {
  ConflictException,
  HttpException,
  Inject,
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { CreationRateLimiter } from './creation-rate-limiter';
import {
  GUEST_SESSION_CONFIG,
  GUEST_SESSION_REPOSITORY,
  GuestSession,
  GuestSessionRepository,
  GuestSessionView,
} from './guest-session.types';

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

@Injectable()
export class GuestSessionService {
  constructor(
    @Inject(GUEST_SESSION_REPOSITORY) private readonly repo: GuestSessionRepository,
    @Inject(GUEST_SESSION_CONFIG)
    private readonly config: { startingBalance: number; createLimit?: number; createWindowSeconds?: number },
  ) {
    const { createLimit, createWindowSeconds } = config;
    if (createLimit && createWindowSeconds) {
      this.limiter = new CreationRateLimiter(createLimit, createWindowSeconds * 1000);
    }
  }

  private readonly limiter?: CreationRateLimiter;

  private async findKnown(cookieId?: string): Promise<GuestSession | null> {
    return cookieId && UUID.test(cookieId) ? this.repo.find(cookieId) : null;
  }

  async startOrResume(
    cookieId?: string,
    clientKey = 'unknown',
  ): Promise<{ session: GuestSession; resumed: boolean }> {
    const existing = await this.findKnown(cookieId);
    if (existing) return { session: existing, resumed: true };
    if (this.limiter && !this.limiter.tryAcquire(clientKey)) {
      throw new HttpException('Too many guest sessions started, try again later', 429);
    }
    return { session: await this.repo.create(this.config.startingBalance), resumed: false };
  }

  async claimTopUp(cookieId?: string): Promise<GuestSession> {
    const existing = await this.findKnown(cookieId);
    if (!existing) throw new NotFoundException('Guest session not found');
    const updated = await this.repo.claimTopUp(existing.id, this.config.startingBalance);
    if (!updated) throw new ConflictException('No top-up is available while balance is 1 or more');
    return updated;
  }

  view(session: GuestSession, resumed: boolean): GuestSessionView {
    return {
      balance: session.balance,
      startingBalance: this.config.startingBalance,
      resumed,
      canClaimTopUp: session.balance < 1,
    };
  }
}
