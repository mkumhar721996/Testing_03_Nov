import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { HealthController } from './health/health.controller';
import { PLACEHOLDER_JACKPOT_POLICY } from './spin/jackpot.handoff';
import { PgSpinRepository } from './spin/pg-spin.repository';
import { generateGrid } from './spin/reel.generator';
import { SpinController } from './spin/spin.controller';
import { GRID_GENERATOR, JACKPOT_POLICY, SPIN_REPOSITORY, SpinService } from './spin/spin.service';

@Module({
  controllers: [HealthController, SpinController],
  providers: [
    SpinService,
    {
      provide: SPIN_REPOSITORY,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required to record spins');
        }
        return new PgSpinRepository(new Pool({ connectionString: process.env.DATABASE_URL }));
      },
    },
    { provide: JACKPOT_POLICY, useValue: PLACEHOLDER_JACKPOT_POLICY },
    { provide: GRID_GENERATOR, useValue: generateGrid },
  ],
})
export class AppModule {}
