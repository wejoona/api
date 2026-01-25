import { Module } from '@nestjs/common';
import { TerminusModule } from '@nestjs/terminus';
import { HealthController } from './health.controller';
import { CircleHealthIndicator, BlnkHealthIndicator, RedisHealthIndicator } from './health-indicators';

@Module({
  imports: [TerminusModule],
  controllers: [HealthController],
  providers: [CircleHealthIndicator, BlnkHealthIndicator, RedisHealthIndicator],
})
export class HealthModule {}
