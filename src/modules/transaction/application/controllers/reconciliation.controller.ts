import {
  Controller,
  Get,
  Post,
  Param,
  HttpCode,
  HttpStatus,
  Logger,
  UseGuards,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { ReconciliationService } from '../domain/services/reconciliation.service';
import {
  UserReconciliationReportDto,
  FullReconciliationReportDto,
  ReconciliationStatusDto,
} from '../dto/responses/reconciliation.dto';

/**
 * Reconciliation Controller
 *
 * Provides API endpoints for balance reconciliation between
 * Blnk ledger, database, and Circle balances.
 *
 * Security: Admin-only endpoints - requires authentication and admin role
 */
@ApiTags('Reconciliation')
@Controller('reconciliation')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'finance')
@ApiBearerAuth()
export class ReconciliationController {
  private readonly logger = new Logger(ReconciliationController.name);

  constructor(private readonly reconciliationService: ReconciliationService) {}

  /**
   * Get reconciliation service status
   */
  @Get('status')
  @ApiOperation({
    summary: 'Get reconciliation service status',
    description:
      'Returns the initialization status and configuration of the reconciliation service',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation service status',
    type: ReconciliationStatusDto,
  })
  getStatus(): ReconciliationStatusDto {
    this.logger.log('Fetching reconciliation service status');
    return this.reconciliationService.getStatus();
  }

  /**
   * Reconcile balance for a specific user
   */
  @Post('user/:userId')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile balance for a specific user',
    description:
      'Compares Blnk ledger, database, and Circle balances for a single user',
  })
  @ApiParam({
    name: 'userId',
    description: 'User ID to reconcile',
    example: 'user-123',
  })
  @ApiResponse({
    status: 200,
    description: 'User reconciliation completed',
    type: UserReconciliationReportDto,
  })
  @ApiResponse({
    status: 404,
    description: 'User or wallet not found',
  })
  async reconcileUser(
    @Param('userId') userId: string,
  ): Promise<UserReconciliationReportDto> {
    this.logger.log(`Reconciling balance for user: ${userId}`);
    return await this.reconciliationService.reconcileUserBalance(userId);
  }

  /**
   * Reconcile all active wallets
   */
  @Post('all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Reconcile all active wallets',
    description:
      'Runs full reconciliation for all active wallets in the system. ' +
      'This can take several minutes for large user bases.',
  })
  @ApiResponse({
    status: 200,
    description: 'Full reconciliation completed',
    type: FullReconciliationReportDto,
  })
  async reconcileAll(): Promise<FullReconciliationReportDto> {
    this.logger.log('Starting full reconciliation of all wallets');
    return await this.reconciliationService.reconcileAllBalances();
  }

  /**
   * Trigger on-demand reconciliation
   * Same as reconcileAll but with different endpoint name for clarity
   */
  @Post('trigger')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Trigger on-demand reconciliation',
    description:
      'Manually trigger a full reconciliation run. ' +
      'Useful for debugging or after system maintenance.',
  })
  @ApiResponse({
    status: 200,
    description: 'Reconciliation triggered successfully',
    type: FullReconciliationReportDto,
  })
  async triggerReconciliation(): Promise<FullReconciliationReportDto> {
    this.logger.log('Triggering on-demand reconciliation');
    return await this.reconciliationService.reconcileAllBalances();
  }
}
