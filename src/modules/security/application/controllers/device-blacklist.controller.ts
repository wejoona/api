import {
  Controller,
  Get,
  Post,
  Delete,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  HttpCode,
  HttpStatus,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
} from '@nestjs/swagger';
import { IsString, IsEnum, IsOptional, IsUUID, IsDateString, MaxLength } from 'class-validator';
import { JwtAuthGuard, AuthenticatedRequest } from '../../../../common/guards';
import { RolesGuard } from '../../../../common/guards/roles.guard';
import { Roles } from '../../../../common/decorators/roles.decorator';
import { DeviceBlacklistService, BlacklistDeviceInput } from '../services/device-blacklist.service';
import { SkipDeviceCheck } from '../guards/device-blacklist.guard';

// DTOs
class BlacklistDeviceDto {
  @IsString()
  @MaxLength(255)
  deviceFingerprint: string;

  @IsEnum(['device_id', 'fingerprint', 'ip_address', 'ip_range', 'user_agent'])
  identifierType: 'device_id' | 'fingerprint' | 'ip_address' | 'ip_range' | 'user_agent';

  @IsString()
  @MaxLength(1000)
  reason: string;

  @IsOptional()
  @IsUUID()
  associatedUserId?: string;

  @IsOptional()
  @IsDateString()
  expiresAt?: string;

  @IsOptional()
  metadata?: Record<string, unknown>;
}

class BlacklistDeviceResponse {
  id: string;
  deviceFingerprint: string;
  identifierType: string;
  reason: string;
  blacklistedBy: string;
  associatedUserId: string | null;
  isActive: boolean;
  expiresAt: Date | null;
  blockedAttempts: number;
  lastBlockedAt: Date | null;
  createdAt: Date;
}

class BlacklistStatisticsResponse {
  totalActive: number;
  totalBlocked: number;
  byType: Record<string, number>;
  last24hBlocked: number;
}

@ApiTags('Admin - Device Blacklist')
@Controller('admin/device-blacklist')
@UseGuards(JwtAuthGuard, RolesGuard)
@Roles('admin', 'super_admin')
@ApiBearerAuth()
@SkipDeviceCheck() // Admin should be able to manage blacklist even from flagged devices
export class DeviceBlacklistController {
  constructor(private readonly blacklistService: DeviceBlacklistService) {}

  @Get()
  @ApiOperation({ summary: 'Get all blacklisted devices' })
  @ApiQuery({ name: 'limit', required: false, type: Number, example: 50 })
  @ApiQuery({ name: 'offset', required: false, type: Number, example: 0 })
  @ApiQuery({ name: 'activeOnly', required: false, type: Boolean, example: true })
  @ApiQuery({
    name: 'identifierType',
    required: false,
    enum: ['device_id', 'fingerprint', 'ip_address', 'ip_range', 'user_agent'],
  })
  @ApiResponse({ status: 200, description: 'List of blacklisted devices' })
  async getBlacklistedDevices(
    @Query('limit') limit?: number,
    @Query('offset') offset?: number,
    @Query('activeOnly') activeOnly?: boolean,
    @Query('identifierType') identifierType?: string,
  ): Promise<{ devices: BlacklistDeviceResponse[]; total: number }> {
    const result = await this.blacklistService.getBlacklistedDevices({
      limit: limit || 50,
      offset: offset || 0,
      activeOnly: activeOnly !== false,
      identifierType,
    });

    return {
      devices: result.devices.map(d => ({
        id: d.id,
        deviceFingerprint: d.deviceFingerprint,
        identifierType: d.identifierType,
        reason: d.reason,
        blacklistedBy: d.blacklistedBy,
        associatedUserId: d.associatedUserId,
        isActive: d.isActive,
        expiresAt: d.expiresAt,
        blockedAttempts: d.blockedAttempts,
        lastBlockedAt: d.lastBlockedAt,
        createdAt: d.createdAt,
      })),
      total: result.total,
    };
  }

  @Get('statistics')
  @ApiOperation({ summary: 'Get blacklist statistics' })
  @ApiResponse({ status: 200, type: BlacklistStatisticsResponse })
  async getStatistics(): Promise<BlacklistStatisticsResponse> {
    return this.blacklistService.getStatistics();
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get blacklist entry by ID' })
  @ApiParam({ name: 'id', description: 'Blacklist entry ID' })
  @ApiResponse({ status: 200, type: BlacklistDeviceResponse })
  @ApiResponse({ status: 404, description: 'Entry not found' })
  async getBlacklistEntry(
    @Param('id', ParseUUIDPipe) id: string,
  ): Promise<BlacklistDeviceResponse | null> {
    const entry = await this.blacklistService.getBlacklistEntry(id);
    if (!entry) {
      return null;
    }

    return {
      id: entry.id,
      deviceFingerprint: entry.deviceFingerprint,
      identifierType: entry.identifierType,
      reason: entry.reason,
      blacklistedBy: entry.blacklistedBy,
      associatedUserId: entry.associatedUserId,
      isActive: entry.isActive,
      expiresAt: entry.expiresAt,
      blockedAttempts: entry.blockedAttempts,
      lastBlockedAt: entry.lastBlockedAt,
      createdAt: entry.createdAt,
    };
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: 'Add device to blacklist' })
  @ApiResponse({ status: 201, type: BlacklistDeviceResponse })
  @ApiResponse({ status: 400, description: 'Invalid input' })
  async blacklistDevice(
    @Request() req: AuthenticatedRequest,
    @Body() dto: BlacklistDeviceDto,
  ): Promise<BlacklistDeviceResponse> {
    const input: BlacklistDeviceInput = {
      deviceFingerprint: dto.deviceFingerprint,
      identifierType: dto.identifierType,
      reason: dto.reason,
      blacklistedBy: req.user.id,
      associatedUserId: dto.associatedUserId,
      expiresAt: dto.expiresAt ? new Date(dto.expiresAt) : undefined,
      metadata: dto.metadata,
    };

    const entry = await this.blacklistService.blacklistDevice(input);

    return {
      id: entry.id,
      deviceFingerprint: entry.deviceFingerprint,
      identifierType: entry.identifierType,
      reason: entry.reason,
      blacklistedBy: entry.blacklistedBy,
      associatedUserId: entry.associatedUserId,
      isActive: entry.isActive,
      expiresAt: entry.expiresAt,
      blockedAttempts: entry.blockedAttempts,
      lastBlockedAt: entry.lastBlockedAt,
      createdAt: entry.createdAt,
    };
  }

  @Delete(':fingerprint')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Remove device from blacklist' })
  @ApiParam({ name: 'fingerprint', description: 'Device fingerprint to unblacklist' })
  @ApiResponse({ status: 200, description: 'Device removed from blacklist' })
  @ApiResponse({ status: 404, description: 'Device not found in blacklist' })
  async unblacklistDevice(
    @Request() req: AuthenticatedRequest,
    @Param('fingerprint') fingerprint: string,
  ): Promise<{ success: boolean; message: string }> {
    const result = await this.blacklistService.unblacklistDevice(fingerprint, req.user.id);

    return {
      success: result,
      message: result
        ? 'Device removed from blacklist'
        : 'Device not found in blacklist',
    };
  }

  @Post('check')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Check if identifiers are blacklisted' })
  @ApiResponse({ status: 200, description: 'Check result' })
  async checkDevice(
    @Body() body: {
      deviceId?: string;
      ipAddress?: string;
      fingerprint?: string;
      userAgent?: string;
    },
  ): Promise<{ isBlacklisted: boolean; reason?: string }> {
    const result = await this.blacklistService.checkMultipleIdentifiers(body);
    return {
      isBlacklisted: result.isBlacklisted,
      reason: result.reason,
    };
  }
}
