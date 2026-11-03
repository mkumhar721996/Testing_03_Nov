import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { GuestSessionController } from './guest-session.controller';
import { loadGuestSessionConfig } from './guest-session.config';
import { GuestSessionCleanup } from './guest-session-cleanup';
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
        const pool = new Pool({ connectionString });
        // An idle client dropped by the server emits 'error'; unhandled, it would crash the process.
        pool.on('error', (error) => console.error('Unexpected idle pg client error', error));
        return new PgGuestSessionRepository(pool);
      },
    },
    GuestSessionCleanup,
  ],
})
export class GuestSessionsModule {}
