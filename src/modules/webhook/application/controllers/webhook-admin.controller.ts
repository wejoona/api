import {
  Controller,
  Get,
  Post,
  Param,
  Body,
  Query,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { CommandBus, QueryBus } from '@nestjs/cqrs';
import {
  GetDeadletterStatsQuery,
  DeadletterStatsResult,
} from '../queries/get-deadletter-stats.query';
import { GetPendingDeadlettersQuery } from '../queries/get-pending-deadletters.query';
import { ResolveDeadletterCommand } from '../commands/resolve-deadletter.command';
import { IgnoreDeadletterCommand } from '../commands/ignore-deadletter.command';
import {
  RetryDeadletterCommand,
  RetryDeadletterResult,
} from '../commands/retry-deadletter.command';
import { WebhookDeadletterOrmEntity } from '../../infrastructure/orm-entities/webhook-deadletter.orm-entity';
import { ResolveDeadletterDto } from '../dto/requests/resolve-deadletter.dto';
import { IgnoreDeadletterDto } from '../dto/requests/ignore-deadletter.dto';
import { DeadletterStatsResponseDto } from '../dto/responses/deadletter-stats.response.dto';
import { RetryDeadletterResponseDto } from '../dto/responses/retry-deadletter.response.dto';

/**
 * Webhook Admin Controller
 *
 * Admin endpoints for managing webhook dead-letter queue.
 * These endpoints should be protected by authentication/authorization guards.
 */
@ApiTags('Webhook Admin')
@Controller('admin/webhooks/deadletters')
// @UseGuards(JwtAuthGuard, AdminGuard) // Uncomment when auth is implemented
@ApiBearerAuth()
export class WebhookAdminController {
  constructor(
    private readonly queryBus: QueryBus,
    private readonly commandBus: CommandBus,
  ) {}

  @Get('stats')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get dead-letter queue statistics' })
  @ApiResponse({
    status: 200,
    description: 'Statistics retrieved successfully',
    type: DeadletterStatsResponseDto,
  })
  async getStats(): Promise<DeadletterStatsResult> {
    return this.queryBus.execute(new GetDeadletterStatsQuery());
  }

  @Get('pending')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Get all pending dead-letter entries' })
  @ApiResponse({
    status: 200,
    description: 'Pending entries retrieved successfully',
  })
  async getPending(
    @Query('provider') provider?: string,
  ): Promise<WebhookDeadletterOrmEntity[]> {
    return this.queryBus.execute(new GetPendingDeadlettersQuery(provider));
  }

  @Post(':id/resolve')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a dead-letter entry as resolved' })
  @ApiResponse({
    status: 200,
    description: 'Entry marked as resolved',
  })
  @ApiResponse({
    status: 404,
    description: 'Entry not found',
  })
  async resolve(
    @Param('id') id: string,
    @Body() dto: ResolveDeadletterDto,
  ): Promise<{ success: boolean }> {
    await this.commandBus.execute(
      new ResolveDeadletterCommand(id, dto.resolvedBy, dto.notes),
    );
    return { success: true };
  }

  @Post(':id/ignore')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark a dead-letter entry as ignored' })
  @ApiResponse({
    status: 200,
    description: 'Entry marked as ignored',
  })
  @ApiResponse({
    status: 404,
    description: 'Entry not found',
  })
  async ignore(
    @Param('id') id: string,
    @Body() dto: IgnoreDeadletterDto,
  ): Promise<{ success: boolean }> {
    await this.commandBus.execute(
      new IgnoreDeadletterCommand(id, dto.ignoredBy, dto.reason),
    );
    return { success: true };
  }

  @Post(':id/retry')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Retry processing a dead-letter entry' })
  @ApiResponse({
    status: 200,
    description: 'Retry attempted',
    type: RetryDeadletterResponseDto,
  })
  @ApiResponse({
    status: 404,
    description: 'Entry not found',
  })
  async retry(@Param('id') id: string): Promise<RetryDeadletterResult> {
    return this.commandBus.execute(new RetryDeadletterCommand(id));
  }
}
