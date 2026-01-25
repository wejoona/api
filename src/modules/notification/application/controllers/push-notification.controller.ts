import {
  Controller,
  Post,
  Delete,
  Body,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { PushNotificationService } from '../domain/services/push-notification.service';
import {
  RegisterFcmTokenRequest,
  RemoveFcmTokenRequest,
} from '../dto/requests/register-fcm-token.request';

/**
 * Push Notification Controller
 *
 * Manages FCM token registration and removal for push notifications.
 *
 * Endpoints:
 * - POST /notifications/push/token - Register FCM token
 * - DELETE /notifications/push/token - Remove FCM token
 */
@ApiTags('Push Notifications')
@Controller('notifications/push')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class PushNotificationController {
  private readonly logger = new Logger(PushNotificationController.name);

  constructor(
    private readonly pushNotificationService: PushNotificationService,
  ) {}

  @Post('token')
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({
    summary: 'Register FCM token for push notifications',
    description:
      'Registers a Firebase Cloud Messaging token for the authenticated user. ' +
      'Call this on app launch and when the token refreshes.',
  })
  @ApiResponse({
    status: 201,
    description: 'Token registered successfully',
    schema: {
      example: {
        success: true,
        message: 'FCM token registered successfully',
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Invalid request data',
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  async registerToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RegisterFcmTokenRequest,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(
      `Registering FCM token for user ${req.user.id}, platform: ${dto.platform}`,
    );

    await this.pushNotificationService.registerToken(
      req.user.id,
      dto.token,
      dto.platform,
      dto.deviceId,
      dto.deviceName,
      dto.appVersion,
      dto.osVersion,
    );

    return {
      success: true,
      message: 'FCM token registered successfully',
    };
  }

  @Delete('token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove FCM token',
    description:
      'Removes an FCM token for the authenticated user. ' +
      'Call this on logout to stop receiving push notifications.',
  })
  @ApiResponse({
    status: 200,
    description: 'Token removed successfully',
    schema: {
      example: {
        success: true,
        message: 'FCM token removed successfully',
      },
    },
  })
  @ApiResponse({
    status: 401,
    description: 'Unauthorized - Invalid or expired token',
  })
  async removeToken(
    @Request() req: AuthenticatedRequest,
    @Body() dto: RemoveFcmTokenRequest,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Removing FCM token for user ${req.user.id}`);

    await this.pushNotificationService.removeToken(req.user.id, dto.token);

    return {
      success: true,
      message: 'FCM token removed successfully',
    };
  }

  @Delete('tokens')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({
    summary: 'Remove all FCM tokens for user',
    description:
      'Removes all FCM tokens for the authenticated user. ' +
      'Call this on full logout from all devices.',
  })
  @ApiResponse({
    status: 200,
    description: 'All tokens removed successfully',
    schema: {
      example: {
        success: true,
        message: 'All FCM tokens removed successfully',
      },
    },
  })
  async removeAllTokens(
    @Request() req: AuthenticatedRequest,
  ): Promise<{ success: boolean; message: string }> {
    this.logger.log(`Removing all FCM tokens for user ${req.user.id}`);

    await this.pushNotificationService.removeAllTokensForUser(req.user.id);

    return {
      success: true,
      message: 'All FCM tokens removed successfully',
    };
  }
}
