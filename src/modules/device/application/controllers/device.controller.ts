import {
  Controller,
  Get,
  Post,
  Delete,
  Param,
  UseGuards,
  ParseUUIDPipe,
} from '@nestjs/common';
import { JwtAuthGuard } from '../../../../common/guards/jwt-auth.guard';
import { CurrentUser } from '../../../../common/decorators/current-user.decorator';
import { DeviceService, DeviceResponse } from '../services/device.service';

interface UserPayload {
  id: string;
  phone: string;
}

@Controller('devices')
@UseGuards(JwtAuthGuard)
export class DeviceController {
  constructor(private readonly deviceService: DeviceService) {}

  @Get()
  async getDevices(@CurrentUser() user: UserPayload): Promise<DeviceResponse[]> {
    return this.deviceService.getActiveDevices(user.id);
  }

  @Get('all')
  async getAllDevices(@CurrentUser() user: UserPayload): Promise<DeviceResponse[]> {
    return this.deviceService.getUserDevices(user.id);
  }

  @Post(':id/trust')
  async trustDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.deviceService.trustDevice(user.id, deviceId);
    return { success: true, message: 'Device trusted successfully' };
  }

  @Post(':id/untrust')
  async untrustDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.deviceService.untrustDevice(user.id, deviceId);
    return { success: true, message: 'Device untrusted successfully' };
  }

  @Delete(':id')
  async revokeDevice(
    @Param('id', ParseUUIDPipe) deviceId: string,
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string }> {
    await this.deviceService.revokeDevice(user.id, deviceId);
    return { success: true, message: 'Device revoked successfully' };
  }

  @Delete()
  async revokeAllDevices(
    @CurrentUser() user: UserPayload,
  ): Promise<{ success: boolean; message: string; count: number }> {
    const count = await this.deviceService.revokeAllDevices(user.id);
    return {
      success: true,
      message: `${count} device(s) revoked successfully`,
      count,
    };
  }
}
