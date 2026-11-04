import { Module } from '@nestjs/common';
import { Pool } from 'pg';
import { EmployeeService, ORG_STRUCTURE_READER } from './employees/employee.service';
import { EmployeesController } from './employees/employees.controller';
import { HrGuard } from './employees/hr.guard';
import {
  APP_BASE_URL,
  CLOCK,
  EMPLOYEE_REPOSITORY,
  generateToken,
  INVITATION_SENDER,
  InvitationService,
  TOKEN_GENERATOR,
} from './employees/invitation.service';
import { InvitationsController } from './employees/invitations.controller';
import { PgEmployeeRepository } from './employees/pg-employee.repository';
import { PgOrgStructureReader } from './employees/pg-org-structure.reader';
import { UnconfiguredInvitationSender } from './employees/unconfigured-invitation.sender';
import { HealthController } from './health/health.controller';
import { PLACEHOLDER_JACKPOT_POLICY } from './spin/jackpot.handoff';
import { PgSpinRepository } from './spin/pg-spin.repository';
import { generateGrid } from './spin/reel.generator';
import { SpinController } from './spin/spin.controller';
import { GRID_GENERATOR, JACKPOT_POLICY, SPIN_REPOSITORY, SpinService } from './spin/spin.service';

const PG_POOL = 'PG_POOL';

@Module({
  controllers: [HealthController, SpinController, EmployeesController, InvitationsController],
  providers: [
    SpinService,
    EmployeeService,
    InvitationService,
    HrGuard,
    {
      provide: PG_POOL,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required to record spins');
        }
        return new Pool({ connectionString: process.env.DATABASE_URL });
      },
    },
    {
      provide: SPIN_REPOSITORY,
      useFactory: (pool: Pool) => new PgSpinRepository(pool),
      inject: [PG_POOL],
    },
    { provide: EMPLOYEE_REPOSITORY, useFactory: (pool: Pool) => new PgEmployeeRepository(pool), inject: [PG_POOL] },
    { provide: ORG_STRUCTURE_READER, useFactory: (pool: Pool) => new PgOrgStructureReader(pool), inject: [PG_POOL] },
    // No email provider is chosen yet (ADR-0008), so every invitation reports "not delivered".
    { provide: INVITATION_SENDER, useClass: UnconfiguredInvitationSender },
    { provide: CLOCK, useValue: () => new Date() },
    { provide: TOKEN_GENERATOR, useValue: generateToken },
    { provide: APP_BASE_URL, useFactory: () => process.env.APP_BASE_URL ?? 'http://localhost:5173' },
    { provide: JACKPOT_POLICY, useValue: PLACEHOLDER_JACKPOT_POLICY },
    { provide: GRID_GENERATOR, useValue: generateGrid },
  ],
})
export class AppModule {}
