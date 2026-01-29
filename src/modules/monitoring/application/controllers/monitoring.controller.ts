/**
 * Monitoring Controller
 * API endpoints for transaction alerts and preferences
 */

import {
  Controller,
  Get,
  Post,
  Put,
  Param,
  Body,
  Query,
  UseGuards,
  HttpCode,
  HttpStatus,
  Logger,
  ParseUUIDPipe,
  BadRequestException,
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
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { AlertRepository } from '../../infrastructure/repositories/alert.repository';
import {
  UserAlertPreferencesUseCase,
  UpdatePreferencesInput,
} from '../usecases/user-alert-preferences.use-case';
import { TransactionMonitorService } from '../services/transaction-monitor.service';
import { AlertRulesService } from '../services/alert-rules.service';
import {
  TransactionAlert,
  AlertType,
  AlertSeverity,
  AlertAction,
  PaginatedAlerts,
  AlertFilterOptions,
  PaginationOptions,
} from '../../domain/interfaces/monitoring.types';

// DTOs
class GetAlertsQueryDto {
  page?: number = 1;
  limit?: number = 20;
  alertTypes?: string;
  severities?: string;
  isRead?: boolean;
  isActionRequired?: boolean;
  fromDate?: string;
  toDate?: string;
}

class UpdatePreferencesDto implements UpdatePreferencesInput {
  emailAlerts?: boolean;
  pushAlerts?: boolean;
  smsAlerts?: boolean;
  largeTransactionThreshold?: number;
  balanceLowThreshold?: number;
  balanceHighThreshold?: number | null;
  dailyLimitThreshold?: number | null;
  alertTypes?: AlertType[];
  quietHoursEnabled?: boolean;
  quietHoursStart?: string;
  quietHoursEnd?: string;
  timezone?: string;
  instantCriticalAlerts?: boolean;
  digestFrequency?: 'realtime' | 'hourly' | 'daily' | 'weekly';
}

class TakeActionDto {
  action: AlertAction;
  notes?: string;
}

class SetThresholdDto {
  value: number;
}

class ToggleAlertTypeDto {
  alertType: AlertType;
  enabled: boolean;
}

class SetQuietHoursDto {
  enabled: boolean;
  startTime?: string;
  endTime?: string;
  timezone?: string;
}

@ApiTags('Alerts & Monitoring')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('alerts')
export class MonitoringController {
  private readonly logger = new Logger(MonitoringController.name);

  constructor(
    private readonly alertRepository: AlertRepository,
    private readonly preferencesUseCase: UserAlertPreferencesUseCase,
    private readonly monitorService: TransactionMonitorService,
    private readonly rulesService: AlertRulesService,
  ) {}

  // ==================== ALERTS ====================

  @Get()
  @ApiOperation({ summary: 'Get user alerts' })
  @ApiResponse({ status: 200, description: 'Returns paginated alerts' })
  async getAlerts(
    @CurrentUser('userId') userId: string,
    @Query() query: GetAlertsQueryDto,
  ): Promise<PaginatedAlerts> {
    const filters: AlertFilterOptions = {
      userId,
      isRead: query.isRead,
      isActionRequired: query.isActionRequired,
    };

    if (query.alertTypes) {
      filters.alertTypes = query.alertTypes.split(',') as AlertType[];
    }

    if (query.severities) {
      filters.severities = query.severities.split(',') as AlertSeverity[];
    }

    if (query.fromDate) {
      filters.fromDate = new Date(query.fromDate);
    }

    if (query.toDate) {
      filters.toDate = new Date(query.toDate);
    }

    const pagination: PaginationOptions = {
      page: query.page || 1,
      limit: Math.min(query.limit || 20, 100),
      sortBy: 'createdAt',
      sortOrder: 'DESC',
    };

    return this.alertRepository.findWithFilters(filters, pagination);
  }

  @Get('unread')
  @ApiOperation({ summary: 'Get unread alerts' })
  @ApiResponse({ status: 200, description: 'Returns unread alerts' })
  async getUnreadAlerts(
    @CurrentUser('userId') userId: string,
    @Query('limit') limit?: number,
  ): Promise<TransactionAlert[]> {
    return this.alertRepository.findUnreadByUser(userId, limit || 50);
  }

  @Get('action-required')
  @ApiOperation({ summary: 'Get alerts requiring action' })
  @ApiResponse({ status: 200, description: 'Returns alerts requiring action' })
  async getActionRequiredAlerts(
    @CurrentUser('userId') userId: string,
  ): Promise<TransactionAlert[]> {
    return this.alertRepository.findActionRequiredByUser(userId);
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get alert statistics' })
  @ApiResponse({ status: 200, description: 'Returns alert statistics' })
  async getStatistics(@CurrentUser('userId') userId: string): Promise<{
    total: number;
    unread: number;
    critical: number;
    actionRequired: number;
    byType: Record<string, number>;
    bySeverity: Record<string, number>;
  }> {
    return this.alertRepository.getStatistics(userId);
  }

  @Get('count')
  @ApiOperation({ summary: 'Get unread alert count' })
  @ApiResponse({ status: 200, description: 'Returns unread count' })
  async getUnreadCount(
    @CurrentUser('userId') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.alertRepository.getUnreadCount(userId);
    return { count };
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get alert details' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Returns alert details' })
  @ApiResponse({ status: 404, description: 'Alert not found' })
  async getAlert(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
  ): Promise<TransactionAlert> {
    const alert = await this.alertRepository.findByIdAndUser(alertId, userId);
    if (!alert) {
      throw new BadRequestException('Alert not found');
    }
    return alert;
  }

  @Post(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark alert as read' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Alert marked as read' })
  async markAsRead(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
  ): Promise<{ success: boolean }> {
    await this.alertRepository.markAsRead(alertId, userId);
    return { success: true };
  }

  @Post('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all alerts as read' })
  @ApiResponse({ status: 200, description: 'All alerts marked as read' })
  async markAllAsRead(
    @CurrentUser('userId') userId: string,
  ): Promise<{ count: number }> {
    const count = await this.alertRepository.markAllAsRead(userId);
    return { count };
  }

  @Post(':id/action')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Take action on alert' })
  @ApiParam({ name: 'id', description: 'Alert ID' })
  @ApiResponse({ status: 200, description: 'Action recorded' })
  async takeAction(
    @CurrentUser('userId') userId: string,
    @Param('id', ParseUUIDPipe) alertId: string,
    @Body() body: TakeActionDto,
  ): Promise<TransactionAlert> {
    const alert = await this.alertRepository.recordAction(
      alertId,
      userId,
      body.action,
    );
    if (!alert) {
      throw new BadRequestException('Alert not found');
    }

    this.logger.log(
      `User ${userId} took action ${body.action} on alert ${alertId}`,
    );
    return alert;
  }

  // ==================== PREFERENCES ====================

  @Get('preferences')
  @ApiOperation({ summary: 'Get alert preferences' })
  @ApiResponse({ status: 200, description: 'Returns user preferences' })
  async getPreferences(@CurrentUser('userId') userId: string) {
    return this.preferencesUseCase.getPreferences(userId);
  }

  @Put('preferences')
  @ApiOperation({ summary: 'Update alert preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser('userId') userId: string,
    @Body() body: UpdatePreferencesDto,
  ) {
    return this.preferencesUseCase.updatePreferences(userId, body);
  }

  @Put('preferences/threshold/large-transaction')
  @ApiOperation({ summary: 'Set large transaction threshold' })
  @ApiResponse({ status: 200, description: 'Threshold updated' })
  async setLargeTransactionThreshold(
    @CurrentUser('userId') userId: string,
    @Body() body: SetThresholdDto,
  ) {
    return this.preferencesUseCase.setLargeTransactionThreshold(
      userId,
      body.value,
    );
  }

  @Put('preferences/threshold/balance-low')
  @ApiOperation({ summary: 'Set low balance threshold' })
  @ApiResponse({ status: 200, description: 'Threshold updated' })
  async setBalanceLowThreshold(
    @CurrentUser('userId') userId: string,
    @Body() body: SetThresholdDto,
  ) {
    return this.preferencesUseCase.setBalanceLowThreshold(userId, body.value);
  }

  @Put('preferences/alert-type')
  @ApiOperation({ summary: 'Toggle alert type' })
  @ApiResponse({ status: 200, description: 'Alert type toggled' })
  async toggleAlertType(
    @CurrentUser('userId') userId: string,
    @Body() body: ToggleAlertTypeDto,
  ) {
    return this.preferencesUseCase.toggleAlertType(
      userId,
      body.alertType,
      body.enabled,
    );
  }

  @Put('preferences/channel/:channel')
  @ApiOperation({ summary: 'Toggle notification channel' })
  @ApiParam({ name: 'channel', description: 'Channel (email, push, sms)' })
  @ApiResponse({ status: 200, description: 'Channel toggled' })
  async toggleChannel(
    @CurrentUser('userId') userId: string,
    @Param('channel') channel: 'email' | 'push' | 'sms',
    @Body() body: { enabled: boolean },
  ) {
    if (!['email', 'push', 'sms'].includes(channel)) {
      throw new BadRequestException('Invalid channel');
    }
    return this.preferencesUseCase.toggleNotificationChannel(
      userId,
      channel,
      body.enabled,
    );
  }

  @Put('preferences/quiet-hours')
  @ApiOperation({ summary: 'Configure quiet hours' })
  @ApiResponse({ status: 200, description: 'Quiet hours configured' })
  async setQuietHours(
    @CurrentUser('userId') userId: string,
    @Body() body: SetQuietHoursDto,
  ) {
    return this.preferencesUseCase.setQuietHours(
      userId,
      body.enabled,
      body.startTime,
      body.endTime,
      body.timezone,
    );
  }

  @Post('preferences/reset')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reset preferences to default' })
  @ApiResponse({ status: 200, description: 'Preferences reset' })
  async resetPreferences(@CurrentUser('userId') userId: string) {
    return this.preferencesUseCase.resetToDefault(userId);
  }

  @Get('preferences/alert-types')
  @ApiOperation({ summary: 'Get available alert types' })
  @ApiResponse({ status: 200, description: 'Returns available alert types' })
  async getAlertTypes() {
    return this.preferencesUseCase.getAvailableAlertTypes();
  }

  // ==================== ADMIN ENDPOINTS ====================

  @Get('admin/dashboard')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get admin alerts dashboard' })
  @ApiResponse({
    status: 200,
    description: 'Returns system-wide alert statistics',
  })
  async getAdminDashboard(
    @Query('fromDate') fromDate?: string,
    @Query('toDate') toDate?: string,
  ): Promise<{
    recentCriticalAlerts: TransactionAlert[];
    alertCountByType: Record<string, number>;
    totalAlerts: number;
    rulesCount: number;
  }> {
    const from = fromDate
      ? new Date(fromDate)
      : new Date(Date.now() - 24 * 60 * 60 * 1000);
    const to = toDate ? new Date(toDate) : new Date();

    const [recentCriticalAlerts, alertCountByType] = await Promise.all([
      this.alertRepository.findRecentAlerts(50, 'critical'),
      this.alertRepository.getAlertCountByType(from, to),
    ]);

    const totalAlerts = Object.values(alertCountByType).reduce(
      (a, b) => a + b,
      0,
    );
    const rulesCount = this.rulesService.getCachedRulesCount();

    return {
      recentCriticalAlerts,
      alertCountByType,
      totalAlerts,
      rulesCount,
    };
  }

  @Post('admin/rules/reload')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Reload monitoring rules' })
  @ApiResponse({ status: 200, description: 'Rules reloaded' })
  async reloadRules(): Promise<{ rulesLoaded: number }> {
    const count = await this.rulesService.forceReloadRules();
    return { rulesLoaded: count };
  }

  @Get('admin/health')
  @UseGuards(RolesGuard)
  @Roles('admin', 'super_admin')
  @ApiOperation({ summary: 'Get monitoring health status' })
  @ApiResponse({ status: 200, description: 'Returns health status' })
  async getHealthStatus() {
    return this.monitorService.getHealthStatus();
  }
}
