import { Module } from '@nestjs/common';
import { APP_GUARD } from '@nestjs/core';
import { Pool } from 'pg';
import { AUTH_CONFIG, loadAuthConfig } from './auth.config';
import { AuthController } from './auth.controller';
import { AUTH_REPOSITORY } from './auth.repository';
import { AuthService, CLOCK } from './auth.service';
import { EMAIL_SENDER } from './email.sender';
import { LoggingEmailSender } from './logging-email.sender';
import { PgAuthRepository } from './pg-auth.repository';
import { SessionGuard } from './session.guard';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    {
      provide: AUTH_REPOSITORY,
      useFactory: () => {
        if (!process.env.DATABASE_URL) {
          throw new Error('DATABASE_URL is required for sign-in');
        }
        return new PgAuthRepository(new Pool({ connectionString: process.env.DATABASE_URL }));
      },
    },
    { provide: EMAIL_SENDER, useClass: LoggingEmailSender },
    { provide: AUTH_CONFIG, useFactory: () => loadAuthConfig() },
    { provide: CLOCK, useValue: () => new Date() },
    { provide: APP_GUARD, useClass: SessionGuard },
  ],
})
export class AuthModule {}
