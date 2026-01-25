import {
  Controller,
  Get,
  Put,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { UpdateNotificationPreferencesDto } from '../dto/requests';
import { NotificationPreferencesResponse } from '../dto/responses';
import {
  GetNotificationPreferencesUsecase,
  UpdateNotificationPreferencesUsecase,
} from '../domain/usecases';

@ApiTags('User Preferences')
@Controller('user')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationPreferencesController {
  constructor(
    private readonly getPreferencesUsecase: GetNotificationPreferencesUsecase,
    private readonly updatePreferencesUsecase: UpdateNotificationPreferencesUsecase,
  ) {}

  @Get('notification-preferences')
  @ApiOperation({ summary: 'Get notification preferences for current user' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences retrieved successfully',
    type: NotificationPreferencesResponse,
  })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async getNotificationPreferences(
    @Request() req: AuthenticatedRequest,
  ): Promise<NotificationPreferencesResponse> {
    const preferences = await this.getPreferencesUsecase.execute({
      userId: req.user.id,
    });

    return NotificationPreferencesResponse.fromDomain(preferences);
  }

  @Put('notification-preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences for current user' })
  @ApiResponse({
    status: 200,
    description: 'Notification preferences updated successfully',
    type: NotificationPreferencesResponse,
  })
  @ApiResponse({ status: 400, description: 'Invalid request data' })
  @ApiResponse({ status: 401, description: 'Unauthorized' })
  async updateNotificationPreferences(
    @Request() req: AuthenticatedRequest,
    @Body() dto: UpdateNotificationPreferencesDto,
  ): Promise<NotificationPreferencesResponse> {
    const preferences = await this.updatePreferencesUsecase.execute({
      userId: req.user.id,
      pushEnabled: dto.pushEnabled,
      pushTransactions: dto.pushTransactions,
      pushSecurity: dto.pushSecurity,
      pushMarketing: dto.pushMarketing,
      emailEnabled: dto.emailEnabled,
      emailTransactions: dto.emailTransactions,
      emailMonthlyStatement: dto.emailMonthlyStatement,
      emailMarketing: dto.emailMarketing,
      smsEnabled: dto.smsEnabled,
      smsTransactions: dto.smsTransactions,
      smsSecurity: dto.smsSecurity,
      largeTransactionThreshold: dto.largeTransactionThreshold,
      lowBalanceThreshold: dto.lowBalanceThreshold,
    });

    return NotificationPreferencesResponse.fromDomain(preferences);
  }
}
