import { Module } from '@nestjs/common';
import { HealthController } from './health/health.controller';
import { ReadingsModule } from './readings/readings.module';

@Module({
  imports: [ReadingsModule],
  controllers: [HealthController],
})
export class AppModule {}
