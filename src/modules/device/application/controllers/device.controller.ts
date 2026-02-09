import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  Body,
  UseGuards,
  ParseUUIDPipe,
  Req,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
} from '@nestjs/swagger';
import { Request } from 'express';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { DeviceService } from '../services/device.service';
import {
  RegisterDeviceDto,
  UpdateFcmTokenDto,
  RenameDeviceDto,
  RegisterPublicKeyDto,
  DeviceResponseDto,
  DeviceActionResponseDto,
} from '../dto';

interface UserPayload {
  id: string;
  phone: string;
}

@ApiTags('devices')
@ApiBearerAuth()
@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Post('register')
  @ApiOperation({ summary: 'Register or update current device' })
  @ApiResponse({
    status: 201,
    description: 'Device registered/updated successfully',
    type: DeviceResponseDto,
  })
  async registerDevice(
    @Body() dto: RegisterDeviceDto,
    @CurrentUser() user: UserPayload,
    @Req() req: Request,
  ): Promise<DeviceResponseDto> {
    const ipAddress = req.ip || req.socket.remoteAddress;
    const device = await this.deviceService.registerDevice({
      userId: user.id,
      ipAddress,
      ...dto,
    });

    return {
      id: device.id,
      deviceIdentifier: device.deviceIdentifier,
      displayName: device.displayName,
      brand: device.brand,
      model: device.model,
      os: device.os,
      osVersion: device.osVersion,
      platform: device.platform,
      isTrusted: device.isTrusted,
      trustedAt: device.trustedAt,
      isActive: device.isActive,
      lastLoginAt: device.lastLoginAt,
      lastIpAddress: device.lastIpAddress,
      loginCount: device.loginCount,
      createdAt: device.createdAt,
    };
  }

  @Post('fcm-token')
  @ApiOperation({ summary: 'Update FCM token for device' })
  @ApiResponse({
    status: 200,
    description: 'FCM token updated successfully',
  })
  async updateFcmToken(
    @Body() dto: UpdateFcmTokenDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    await this.deviceService.updateFcmToken(
      user.id,
      dto.deviceIdentifier,
      dto.fcmToken,
    );
    return {
      success: true,
      message: 'FCM token updated successfully',
    };
  }

  @Get()
  @ApiOperation({ summary: 'Get active devices for current user' })
  @ApiResponse({
    status: 200,
    description: 'Active devices retrieved successfully',
    type: [DeviceResponseDto],
  })
  async getDevices(
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceResponseDto[]> {
    const devices = await this.deviceService.getActiveDevices(user.id);
    return devices.map((device) => ({
      id: device.id,
      deviceIdentifier: device.deviceIdentifier,
      displayName: device.displayName,
      brand: device.brand,
      model: device.model,
      os: device.os,
      osVersion: device.osVersion,
      platform: device.platform,
      isTrusted: device.isTrusted,
      trustedAt: device.trustedAt,
      isActive: device.isActive,
      lastLoginAt: device.lastLoginAt,
      lastIpAddress: device.lastIpAddress,
      loginCount: device.loginCount,
      createdAt: device.createdAt,
    }));
  }

  @Get('all')
  @ApiOperation({ summary: 'Get all devices (including inactive)' })
  @ApiResponse({
    status: 200,
    description: 'All devices retrieved successfully',
    type: [DeviceResponseDto],
  })
  async getAllDevices(
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceResponseDto[]> {
    const devices = await this.deviceService.getUserDevices(user.id);
    return devices.map((device) => ({
      id: device.id,
      deviceIdentifier: device.deviceIdentifier,
      displayName: device.displayName,
      brand: device.brand,
      model: device.model,
      os: device.os,
      osVersion: device.osVersion,
      platform: device.platform,
      isTrusted: device.isTrusted,
      trustedAt: device.trustedAt,
      isActive: device.isActive,
      lastLoginAt: device.lastLoginAt,
      lastIpAddress: device.lastIpAddress,
      loginCount: device.loginCount,
      createdAt: device.createdAt,
    }));
  }

  @Post(':id/trust')
  @ApiOperation({ summary: 'Trust a device (skip OTP for logins)' })
  @ApiResponse({
    status: 200,
    description: 'Device trusted successfully',
    type: DeviceActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Device does not belong to user' })
  async trustDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    await this.deviceService.trustDevice(user.id, deviceId);
    return { success: true, message: 'Device trusted successfully' };
  }

  @Post(':id/untrust')
  @ApiOperation({ summary: 'Untrust a device (require OTP for logins)' })
  @ApiResponse({
    status: 200,
    description: 'Device untrusted successfully',
    type: DeviceActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Device does not belong to user' })
  async untrustDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    await this.deviceService.untrustDevice(user.id, deviceId);
    return { success: true, message: 'Device untrusted successfully' };
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Revoke/deactivate a device' })
  @ApiResponse({
    status: 200,
    description: 'Device revoked successfully',
    type: DeviceActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Device does not belong to user' })
  async revokeDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    await this.deviceService.revokeDevice(user.id, deviceId);
    return { success: true, message: 'Device revoked successfully' };
  }

  @Delete()
  @ApiOperation({ summary: 'Revoke all devices (logout from all devices)' })
  @ApiResponse({
    status: 200,
    description: 'All devices revoked successfully',
    type: DeviceActionResponseDto,
  })
  async revokeAllDevices(
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    const count = await this.deviceService.revokeAllDevices(user.id);
    return {
      success: true,
      message: `${count} device(s) revoked successfully`,
      count,
    };
  }

  @Post(':id/rename')
  @ApiOperation({ summary: 'Rename a device' })
  @ApiResponse({
    status: 200,
    description: 'Device renamed successfully',
    type: DeviceActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Device does not belong to user' })
  async renameDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @Body() dto: RenameDeviceDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    await this.deviceService.renameDevice(user.id, deviceId, dto.name);
    return { success: true, message: 'Device renamed successfully' };
  }

  @Post(':id/register-key')
  @ApiOperation({
    summary: 'Register or update public key for a device (ECDH P-256 JWK)',
  })
  @ApiResponse({
    status: 200,
    description: 'Public key registered successfully',
    type: DeviceActionResponseDto,
  })
  @ApiResponse({ status: 404, description: 'Device not found' })
  @ApiResponse({ status: 403, description: 'Device does not belong to user' })
  async registerPublicKey(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @Body() dto: RegisterPublicKeyDto,
    @CurrentUser() user: UserPayload,
  ): Promise<DeviceActionResponseDto> {
    await this.deviceService.registerPublicKey(
      user.id,
      deviceId,
      dto.publicKeyJwk,
    );
    return { success: true, message: 'Public key registered successfully' };
  }
}
