import { Module } from '@nestjs/common';
import { ProfilingController } from './profiling.controller';
import { ProfilingService } from './profiling.service';
import { MetricsModule } from '../metrics/metrics.module';
import { DatabaseProfiler } from '@/common/profilers/database.profiler';
import { CacheProfiler } from '@/common/profilers/cache.profiler';
import { PerformanceInterceptor } from '@/common/interceptors/performance.interceptor';

@Module({
  imports: [MetricsModule],
  controllers: [ProfilingController],
  providers: [
    ProfilingService,
    DatabaseProfiler,
    CacheProfiler,
    PerformanceInterceptor,
  ],
  exports: [
    ProfilingService,
    DatabaseProfiler,
    CacheProfiler,
    PerformanceInterceptor,
  ],
})
export class ProfilingModule {}
