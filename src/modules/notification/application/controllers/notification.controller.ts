import {
  Controller,
  Get,
  Put,
  Post,
  Delete,
  Param,
  Query,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  HttpException,
  ServiceUnavailableException,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiParam,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import {
  GetUserNotificationsUseCase,
  MarkNotificationReadUseCase,
  MarkAllNotificationsReadUseCase,
  RegisterDeviceTokenUseCase,
  UnregisterDeviceTokenUseCase,
  UnregisterAllDeviceTokensUseCase,
  GetUnreadCountUseCase,
} from '../domain/usecases';
import {
  RegisterDeviceTokenRequest,
  GetNotificationsRequest,
  RegisterFcmTokenRequest,
  RemoveFcmTokenRequest,
} from '../dto/requests';
import {
  NotificationListResponse,
  UnreadCountResponse,
} from '../dto/responses';

@ApiTags('Notifications')
@Controller('notifications')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class NotificationController {
  constructor(
    private readonly getUserNotificationsUseCase: GetUserNotificationsUseCase,
    private readonly markNotificationReadUseCase: MarkNotificationReadUseCase,
    private readonly markAllNotificationsReadUseCase: MarkAllNotificationsReadUseCase,
    private readonly registerDeviceTokenUseCase: RegisterDeviceTokenUseCase,
    private readonly unregisterDeviceTokenUseCase: UnregisterDeviceTokenUseCase,
    private readonly unregisterAllDeviceTokensUseCase: UnregisterAllDeviceTokensUseCase,
    private readonly getUnreadCountUseCase: GetUnreadCountUseCase,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get user notifications (paginated)' })
  @ApiResponse({
    status: 200,
    description: 'Returns paginated list of notifications',
    type: NotificationListResponse,
    schema: {
      example: {
        notifications: [
          {
            id: '123e4567-e89b-12d3-a456-426614174000',
            type: 'transfer_received',
            status: 'sent',
            title: 'Payment Received',
            body: 'You received $50.00 from John Doe',
            data: { amount: '50.00', sender: 'John Doe' },
            referenceType: 'transaction',
            referenceId: '123e4567-e89b-12d3-a456-426614174001',
            sentAt: '2026-01-23T10:30:00.000Z',
            deliveredAt: '2026-01-23T10:30:05.000Z',
            readAt: null,
            createdAt: '2026-01-23T10:30:00.000Z',
            isUnread: true,
          },
        ],
        total: 42,
        unreadCount: 5,
        limit: 20,
        offset: 0,
      },
    },
  })
  async getNotifications(
    @Request() req: AuthenticatedRequest,
    @Query() query: GetNotificationsRequest,
  ): Promise<NotificationListResponse> {
    try {
      return await this.getUserNotificationsUseCase.execute({
        userId: req.user.id,
        limit: query.limit,
        offset: query.offset,
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  @Get('unread/count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({
    status: 200,
    description: 'Returns count of unread notifications',
    type: UnreadCountResponse,
    schema: {
      example: {
        count: 5,
      },
    },
  })
  async getUnreadCount(
    @Request() req: AuthenticatedRequest,
  ): Promise<UnreadCountResponse> {
    return this.getUnreadCountForUser(req.user.id);
  }

  @Get('unread-count')
  @ApiOperation({
    summary: 'Get unread notification count (mobile-compatible alias)',
  })
  @ApiResponse({
    status: 200,
    description: 'Returns count of unread notifications',
    type: UnreadCountResponse,
  })
  async getUnreadCountAlias(
    @Request() req: AuthenticatedRequest,
  ): Promise<UnreadCountResponse> {
    return this.getUnreadCountForUser(req.user.id);
  }

  private getUnreadCountForUser(userId: string): Promise<UnreadCountResponse> {
    return this.getUnreadCountUseCase
      .execute({
        userId,
      })
      .catch((error) => this.throwDependencyUnavailable(error));
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiParam({
    name: 'id',
    description: 'Notification ID',
    example: '123e4567-e89b-12d3-a456-426614174000',
  })
  @ApiResponse({
    status: 204,
    description: 'Notification marked as read',
  })
  @ApiResponse({
    status: 404,
    description: 'Notification not found',
  })
  @ApiResponse({
    status: 403,
    description: 'Forbidden - notification does not belong to user',
  })
  async markAsRead(
    @Request() req: AuthenticatedRequest,
    @Param('id') notificationId: string,
  ): Promise<void> {
    try {
      await this.markNotificationReadUseCase.execute({
        userId: req.user.id,
        notificationId,
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  @Put('read-all')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({
    status: 204,
    description: 'All notifications marked as read',
  })
  async markAllAsRead(@Request() req: AuthenticatedRequest): Promise<void> {
    try {
      await this.markAllNotificationsReadUseCase.execute({
        userId: req.user.id,
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  @Post('device-token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({
    status: 201,
    description: 'Device token registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async registerDeviceToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: RegisterDeviceTokenRequest,
  ): Promise<{ message: string }> {
    try {
      await this.registerDeviceTokenUseCase.execute({
        userId: req.user.id,
        token: body.token,
        platform: body.platform,
        deviceId: body.deviceId,
        deviceName: body.deviceName,
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }

    return {
      message: 'Device token registered successfully',
    };
  }

  @Delete('device-token/:token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiParam({
    name: 'token',
    description: 'Device token to unregister',
    example: 'ExponentPushToken[xxxxxxxxxxxxxxxxxxxxxx]',
  })
  @ApiResponse({
    status: 204,
    description: 'Device token unregistered successfully',
  })
  async unregisterDeviceToken(@Param('token') token: string): Promise<void> {
    try {
      await this.unregisterDeviceTokenUseCase.execute({ token });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  // Mobile SDK compatible endpoints

  @Post('push/token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Register FCM push token (mobile SDK compatible)' })
  @ApiResponse({
    status: 201,
    description: 'FCM token registered successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async registerPushToken(
    @Request() req: AuthenticatedRequest,
    @Body() body: RegisterFcmTokenRequest,
  ): Promise<{ message: string }> {
    try {
      await this.registerDeviceTokenUseCase.execute({
        userId: req.user.id,
        token: body.token,
        platform: body.platform,
        deviceId: body.deviceId,
        deviceName: body.deviceName,
        // Note: appVersion and osVersion are accepted but not yet stored in the entity
        // These can be added to the entity and repository in a future migration
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }

    return {
      message: 'Push token registered successfully',
    };
  }

  @Delete('push/token')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: 'Remove a specific FCM push token (mobile SDK compatible)',
  })
  @ApiResponse({
    status: 204,
    description: 'FCM token removed successfully',
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  async removePushToken(@Body() body: RemoveFcmTokenRequest): Promise<void> {
    try {
      await this.unregisterDeviceTokenUseCase.execute({ token: body.token });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  @Delete('push/tokens')
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary:
      'Remove all FCM push tokens for current user (mobile SDK compatible)',
  })
  @ApiResponse({
    status: 204,
    description: 'All FCM tokens removed successfully',
  })
  async removeAllPushTokens(
    @Request() req: AuthenticatedRequest,
  ): Promise<void> {
    try {
      await this.unregisterAllDeviceTokensUseCase.execute({
        userId: req.user.id,
      });
    } catch (error) {
      this.throwDependencyUnavailable(error);
    }
  }

  private throwDependencyUnavailable(error: unknown): never {
    if (error instanceof HttpException) {
      throw error;
    }

    throw new ServiceUnavailableException({
      code: 'NOTIFICATION_DEPENDENCY_UNAVAILABLE',
      message:
        'Notifications are temporarily unavailable. Please try again later.',
      dependency: 'notification_store',
      retryable: true,
      supportReviewRequired: false,
    });
  }
}
