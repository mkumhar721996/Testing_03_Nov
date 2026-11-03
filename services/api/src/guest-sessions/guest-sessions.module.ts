import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { GuestSessionController } from './guest-session.controller';
import { loadGuestSessionConfig } from './guest-session.config';
import { GuestSessionService } from './guest-session.service';
import { PgGuestSessionRepository } from './pg-guest-session.repository';
import { GUEST_SESSION_CONFIG, GUEST_SESSION_REPOSITORY } from './guest-session.types';

@Module({
  controllers: [GuestSessionController],
  providers: [
    GuestSessionService,
    { provide: GUEST_SESSION_CONFIG, useFactory: () => loadGuestSessionConfig() },
    {
      provide: GUEST_SESSION_REPOSITORY,
      useFactory: () => {
        const connectionString = process.env.DATABASE_URL;
        if (!connectionString) throw new Error('DATABASE_URL is required');
        return new PgGuestSessionRepository(new Pool({ connectionString }));
      },
    },
  ],
})
export class GuestSessionsModule {}
