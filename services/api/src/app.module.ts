import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { AssignmentController } from './assignment/assignment.controller';
import { ASSIGNMENT_REPOSITORY } from './assignment/assignment.repository';
import { PgAssignmentRepository } from './assignment/pg-assignment.repository';
import { CapacityController } from './capacity/capacity.controller';
import { CAPACITY_REPOSITORY } from './capacity/capacity.repository';
import { CapacityService } from './capacity/capacity.service';
import { PgCapacityRepository } from './capacity/pg-capacity.repository';
import { HealthController } from './health/health.controller';
import { BalanceController } from './player/balance.controller';
import { PgPlayerRepository } from './player/pg-player.repository';
import { PLAYER_REPOSITORY } from './player/player.repository';
import { PLACEHOLDER_JACKPOT_POLICY } from './spin/jackpot.handoff';
import { PgSpinRepository } from './spin/pg-spin.repository';
import { generateGrid } from './spin/reel.generator';
import { SpinController } from './spin/spin.controller';
import { AdminGuard } from './technicians/admin.guard';
import { PgTechnicianRepository } from './technicians/pg-technician.repository';
import { TECHNICIAN_REPOSITORY } from './technicians/technician.repository';
import { TechniciansController } from './technicians/technicians.controller';
import { GRID_GENERATOR, JACKPOT_POLICY, SPIN_REPOSITORY, SpinService } from './spin/spin.service';

@Module({
  controllers: [
    HealthController,
    SpinController,
    BalanceController,
    CapacityController,
    TechniciansController,
    AssignmentController,
  ],
  providers: [
    AdminGuard,
    {
      provide: ASSIGNMENT_REPOSITORY,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required to assign technicians to bookings');
        }
        return new PgAssignmentRepository(new Pool({ connectionString: process.env.DATABASE_URL }));
      },
    },
    CapacityService,
    {
      provide: CAPACITY_REPOSITORY,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required to hold visit limits and bookings');
        }
        return new PgCapacityRepository(new Pool({ connectionString: process.env.DATABASE_URL }));
      },
    },
    {
      provide: TECHNICIAN_REPOSITORY,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required to hold technicians');
        }
        return new PgTechnicianRepository(new Pool({ connectionString: process.env.DATABASE_URL }));
      },
    },
    {
      provide: PLAYER_REPOSITORY,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required to hold player balances');
        }
        return new PgPlayerRepository(new Pool({ connectionString: process.env.DATABASE_URL }));
      },
    },
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
