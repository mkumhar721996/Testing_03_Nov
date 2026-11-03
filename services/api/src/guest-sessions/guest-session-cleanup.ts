import { Inject, Injectable, OnModuleDestroy, OnModuleInit, Optional } from '@nestjs/common';
import {
  GUEST_SESSION_CONFIG,
  GUEST_SESSION_REPOSITORY,
  GuestSessionRepository,
} from './guest-session.types';

const ONE_HOUR_MS = 3_600_000;

// Sessions whose cookie has expired can never be resumed, so they are safe to delete.
@Injectable()
export class GuestSessionCleanup implements OnModuleInit, OnModuleDestroy {
  private timer?: NodeJS.Timeout;

  constructor(
    @Inject(GUEST_SESSION_REPOSITORY) private readonly repo: GuestSessionRepository,
    @Inject(GUEST_SESSION_CONFIG) private readonly config: { cookieMaxAgeSeconds: number },
    @Optional() private readonly intervalMs: number = ONE_HOUR_MS,
  ) {}

  onModuleInit(): void {
    void this.purge();
    this.timer = setInterval(() => void this.purge(), this.intervalMs);
    this.timer.unref();
  }

  onModuleDestroy(): void {
    clearInterval(this.timer);
  }

  private async purge(): Promise<void> {
    try {
      await this.repo.deleteExpired(this.config.cookieMaxAgeSeconds);
    } catch (error) {
      console.error('Guest session cleanup failed', error);
    }
  }
}
