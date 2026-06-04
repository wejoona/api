/**
 * Notification Controller
 * API endpoints for notification management
 */

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
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { IsEnum, IsObject, IsOptional, IsString } from 'class-validator';
import { JwtAuthGuard } from '@common/guards/jwt-auth.guard';
import { CurrentUser } from '@common/decorators/current-user.decorator';
import { NotificationService } from '../services/notification.service';

class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsEnum(['ios', 'android', 'web'])
  platform: 'ios' | 'android' | 'web';
}

class UpdatePreferencesDto {
  @IsOptional()
  @IsObject()
  channels?: {
    push?: boolean;
    sms?: boolean;
    email?: boolean;
    inApp?: boolean;
  };

  @IsOptional()
  @IsObject()
  categories?: {
    transaction?: boolean;
    kyc?: boolean;
    security?: boolean;
    marketing?: boolean;
    system?: boolean;
    risk?: boolean;
    referral?: boolean;
  };

  @IsOptional()
  @IsObject()
  quietHours?: {
    enabled: boolean;
    startTime: string;
    endTime: string;
    timezone: string;
  };

  @IsOptional()
  @IsString()
  language?: string;
}

@ApiTags('Notifications')
@ApiBearerAuth()
@Controller('notifications')
@UseGuards(JwtAuthGuard)
export class NotificationController {
  constructor(private readonly notificationService: NotificationService) {}

  @Get()
  @ApiOperation({ summary: 'Get notification history' })
  @ApiResponse({ status: 200, description: 'Notification history retrieved' })
  async getHistory(
    @CurrentUser() user: any,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
    @Query('category') category?: string,
  ) {
    const result = await this.notificationService.getHistory(user.id, {
      page: page || 1,
      limit: limit || 20,
      category,
    });

    return {
      success: true,
      data: result.entries,
      meta: {
        total: result.total,
        page: page || 1,
        limit: limit || 20,
      },
    };
  }

  @Get('unread-count')
  @ApiOperation({ summary: 'Get unread notification count' })
  @ApiResponse({ status: 200, description: 'Unread count retrieved' })
  async getUnreadCount(@CurrentUser() user: any) {
    const count = await this.notificationService.getUnreadCount(user.id);
    return {
      success: true,
      data: { count },
    };
  }

  @Put(':id/read')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark notification as read' })
  @ApiResponse({ status: 200, description: 'Notification marked as read' })
  async markAsRead(
    @CurrentUser() user: any,
    @Param('id') notificationId: string,
  ) {
    await this.notificationService.markAsRead(notificationId, user.id);
    return {
      success: true,
      message: 'Notification marked as read',
    };
  }

  @Put('read-all')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Mark all notifications as read' })
  @ApiResponse({ status: 200, description: 'All notifications marked as read' })
  async markAllAsRead(@CurrentUser() user: any) {
    await this.notificationService.markAllAsRead(user.id);
    return {
      success: true,
      message: 'All notifications marked as read',
    };
  }

  @Get('preferences')
  @ApiOperation({ summary: 'Get notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences retrieved' })
  async getPreferences(@CurrentUser() user: any) {
    const preferences = await this.notificationService.getPreferences(user.id);
    return {
      success: true,
      data: preferences,
    };
  }

  @Put('preferences')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Update notification preferences' })
  @ApiResponse({ status: 200, description: 'Preferences updated' })
  async updatePreferences(
    @CurrentUser() user: any,
    @Body() dto: UpdatePreferencesDto,
  ) {
    const preferences = await this.notificationService.updatePreferences(
      user.id,
      {
        channels: dto.channels as any,
        categories: dto.categories as any,
        quietHours: dto.quietHours,
        language: dto.language,
      },
    );

    return {
      success: true,
      data: preferences,
    };
  }

  @Post('device-token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Register device token for push notifications' })
  @ApiResponse({ status: 200, description: 'Device token registered' })
  async registerDeviceToken(
    @CurrentUser() user: any,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    const token = await this.notificationService.registerDeviceToken(
      user.id,
      dto.token,
      dto.platform,
    );

    return {
      success: true,
      data: {
        tokenId: token.id,
        isKnownDevice: token.lastUsedAt !== token.createdAt,
      },
    };
  }

  @Delete('device-token/:token')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Unregister device token' })
  @ApiResponse({ status: 200, description: 'Device token unregistered' })
  async unregisterDeviceToken(@Param('token') token: string) {
    await this.notificationService.unregisterDeviceToken(token);
    return {
      success: true,
      message: 'Device token unregistered',
    };
  }
}
