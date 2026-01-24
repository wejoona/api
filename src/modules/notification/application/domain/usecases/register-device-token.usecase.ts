import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/device-token.repository';

export interface RegisterDeviceTokenParams {
  userId: string;
  token: string;
  platform: 'ios' | 'android' | 'web';
  deviceId?: string;
  deviceName?: string;
}

/**
 * Register Device Token Use Case
 *
 * Registers or updates a device token for push notifications.
 * Handles both new registrations and updates to existing tokens.
 */
@Injectable()
export class RegisterDeviceTokenUseCase {
  private readonly logger = new Logger(RegisterDeviceTokenUseCase.name);

  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async execute(params: RegisterDeviceTokenParams): Promise<void> {
    this.logger.log(
      `Registering device token for user ${params.userId} on platform ${params.platform}`,
    );

    await this.deviceTokenRepository.upsert(
      params.userId,
      params.token,
      params.platform,
      params.deviceId,
      params.deviceName,
    );

    this.logger.log(
      `Device token registered successfully for user ${params.userId}`,
    );
  }
}
