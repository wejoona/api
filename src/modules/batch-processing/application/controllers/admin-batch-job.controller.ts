import {
  Controller,
  Get,
  Post,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { RolesGuard, Roles } from '@common/guards/roles.guard';
import { BatchJobService } from '../services/batch-job.service';
import { BatchJobFiltersDto } from '../dto/batch-job-filters.dto';
import { BatchQueueService } from '../../infrastructure/queues/batch-queue.service';

import { ApiTags } from '@nestjs/swagger';
@ApiTags('Batch Processing - Admin')
@Controller('admin/batch-jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
export class AdminBatchJobController {
  constructor(
    private readonly batchJobService: BatchJobService,
    private readonly batchQueueService: BatchQueueService,
  ) {}

  @Get()
  async getAllBatchJobs(@Query() filters: BatchJobFiltersDto) {
    const batchJobs = await this.batchJobService.getBatchJobsByFilters({
      ...filters,
      createdAfter: filters.createdAfter
        ? new Date(filters.createdAfter)
        : undefined,
      createdBefore: filters.createdBefore
        ? new Date(filters.createdBefore)
        : undefined,
    });

    return {
      success: true,
      data: batchJobs,
      count: batchJobs.length,
    };
  }

  @Get('metrics')
  async getAllMetrics() {
    const [jobMetrics, queueMetrics] = await Promise.all([
      this.batchJobService.getJobMetrics(),
      this.batchJobService.getQueueMetrics(),
    ]);

    return {
      success: true,
      data: {
        jobs: jobMetrics,
        queue: queueMetrics,
      },
    };
  }

  @Get('queue/metrics')
  async getQueueMetrics() {
    const metrics = await this.batchQueueService.getQueueMetrics();
    return {
      success: true,
      data: metrics,
    };
  }

  @Post('queue/pause')
  @HttpCode(HttpStatus.OK)
  async pauseQueue() {
    await this.batchQueueService.pauseQueue();
    return {
      success: true,
      message: 'Queue paused successfully',
    };
  }

  @Post('queue/resume')
  @HttpCode(HttpStatus.OK)
  async resumeQueue() {
    await this.batchQueueService.resumeQueue();
    return {
      success: true,
      message: 'Queue resumed successfully',
    };
  }

  @Post('queue/clean')
  @HttpCode(HttpStatus.OK)
  async cleanQueue() {
    await this.batchQueueService.cleanQueue();
    return {
      success: true,
      message: 'Queue cleaned successfully',
    };
  }

  @Get(':id')
  async getBatchJob(@Param('id') id: string) {
    // Admin can view any job, so we pass a dummy userId that won't match
    // TODO: Refactor to add a separate admin method that doesn't check userId
    const batchJob = await this.batchJobService.getBatchJob(id, id);
    return {
      success: true,
      data: batchJob,
    };
  }
}
