import { Module } from '@nestjs/common';
import { GuestSessionsModule } from './guest-sessions/guest-sessions.module';
import { HealthController } from './health/health.controller';

@Module({
  imports: [GuestSessionsModule],
  controllers: [HealthController],
})
export class AppModule {}
