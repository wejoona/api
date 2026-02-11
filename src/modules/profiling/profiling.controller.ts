import {
  Controller,
  Get,
  Post,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ProfilingService } from './profiling.service';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';

@ApiExcludeController()
@Controller('profiling')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class ProfilingController {
  constructor(private readonly profilingService: ProfilingService) {}

  /**
   * GET /profiling/report
   * Get comprehensive performance report
   */
  @Get('report')
  async getPerformanceReport() {
    return this.profilingService.getPerformanceReport();
  }

  /**
   * GET /profiling/endpoints
   * Get endpoint performance statistics
   */
  @Get('endpoints')
  getEndpointStats() {
    return {
      endpoints: this.profilingService.getEndpointStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/slow-queries
   * Get slow database queries
   */
  @Get('slow-queries')
  getSlowQueries() {
    const stats = this.profilingService.getDatabaseStats();
    return {
      slowQueries: stats.slowQueries,
      n1Patterns: stats.n1Patterns,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/cache
   * Get cache performance statistics
   */
  @Get('cache')
  getCacheStats() {
    return {
      ...this.profilingService.getCacheStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/database/tables
   * Get database table statistics
   */
  @Get('database/tables')
  async getTableStatistics() {
    const tables = await this.profilingService.getTableStatistics();
    return {
      tables,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/database/active-queries
   * Get currently active database queries
   */
  @Get('database/active-queries')
  async getActiveQueries() {
    const queries = await this.profilingService.getActiveQueries();
    return {
      queries,
      count: queries.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/database/connection-pool
   * Get connection pool statistics
   */
  @Get('database/connection-pool')
  async getConnectionPoolStats() {
    const stats = await this.profilingService.getConnectionPoolStats();
    return {
      ...stats,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/database/missing-indexes
   * Get recommendations for missing indexes
   */
  @Get('database/missing-indexes')
  async getMissingIndexes() {
    const indexes = await this.profilingService.analyzeMissingIndexes();
    return {
      recommendations: indexes,
      count: indexes.length,
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * GET /profiling/system
   * Get system resource statistics
   */
  @Get('system')
  getSystemStats() {
    return {
      ...this.profilingService.getSystemStats(),
      timestamp: new Date().toISOString(),
    };
  }

  /**
   * POST /profiling/reset
   * Reset all profiler statistics
   */
  @Post('reset')
  @HttpCode(HttpStatus.OK)
  resetProfilers() {
    return this.profilingService.resetProfilers();
  }
}
