import { Controller, Get, Query, UseGuards } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiQuery,
  ApiResponse,
  ApiTags,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '@common/guards';
import { RolesGuard } from '@common/guards/roles.guard';
import { Roles } from '@common/decorators/roles.decorator';
import { ScheduledJobsService } from '../services/scheduled-jobs.service';

@ApiTags('Jobs')
@ApiBearerAuth()
@Controller('jobs')
@UseGuards(JwtAuthGuard, RolesGuard)
export class JobsController {
  constructor(private readonly scheduledJobsService: ScheduledJobsService) {}

  @Get('cronhub/status')
  @Roles('admin')
  @ApiOperation({
    summary: 'Get scheduled job status in a CronHub-compatible shape',
  })
  @ApiQuery({
    name: 'jobName',
    required: false,
    example: 'daily_reconciliation',
  })
  @ApiResponse({
    status: 200,
    description: 'CronHub-compatible scheduled job status',
  })
  async getCronHubStatus(@Query('jobName') jobName?: string) {
    return this.scheduledJobsService.getCronHubCompatibleStatus(jobName);
  }
}
