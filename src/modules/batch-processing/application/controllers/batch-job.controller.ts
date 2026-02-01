import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { User } from '@/modules/user/domain/entities/user.entity';
import { BatchJobService } from '../services/batch-job.service';
import { CreateBatchJobDto } from '../dto/create-batch-job.dto';
import { UpdateBatchJobDto } from '../dto/update-batch-job.dto';
import { BatchJobFiltersDto } from '../dto/batch-job-filters.dto';

@Controller('batch-jobs')
@UseGuards(JwtAuthGuard)
export class BatchJobController {
  constructor(private readonly batchJobService: BatchJobService) {}

  @Post()
  @HttpCode(HttpStatus.CREATED)
  async createBatchJob(
    @Body() dto: CreateBatchJobDto,
    @CurrentUser() user: User,
  ) {
    const batchJob = await this.batchJobService.createBatchJob(dto, user.id);
    return {
      success: true,
      data: batchJob,
    };
  }

  @Get()
  async getBatchJobs(
    @Query() filters: BatchJobFiltersDto,
    @CurrentUser() user: User,
  ) {
    const batchJobs = await this.batchJobService.getBatchJobsByFilters({
      ...filters,
      userId: user.id,
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

  @Get('me')
  async getMyBatchJobs(@CurrentUser() user: User) {
    const batchJobs = await this.batchJobService.getUserBatchJobs(user.id);
    return {
      success: true,
      data: batchJobs,
      count: batchJobs.length,
    };
  }

  @Get('metrics')
  async getMetrics(@CurrentUser() user: User) {
    const [jobMetrics, queueMetrics] = await Promise.all([
      this.batchJobService.getJobMetrics(user.id),
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

  @Get(':id')
  async getBatchJob(@Param('id') id: string, @CurrentUser() user: User) {
    const batchJob = await this.batchJobService.getBatchJob(id, user.id);
    return {
      success: true,
      data: batchJob,
    };
  }

  @Put(':id')
  async updateBatchJob(
    @Param('id') id: string,
    @Body() dto: UpdateBatchJobDto,
    @CurrentUser() user: User,
  ) {
    const batchJob = await this.batchJobService.updateBatchJob(
      id,
      dto,
      user.id,
    );
    return {
      success: true,
      data: batchJob,
    };
  }

  @Post(':id/cancel')
  @HttpCode(HttpStatus.OK)
  async cancelBatchJob(@Param('id') id: string, @CurrentUser() user: User) {
    const batchJob = await this.batchJobService.cancelBatchJob(id, user.id);
    return {
      success: true,
      data: batchJob,
      message: 'Batch job cancelled successfully',
    };
  }

  @Delete(':id')
  @HttpCode(HttpStatus.NO_CONTENT)
  async deleteBatchJob(@Param('id') id: string, @CurrentUser() user: User) {
    await this.batchJobService.deleteBatchJob(id, user.id);
  }
}
