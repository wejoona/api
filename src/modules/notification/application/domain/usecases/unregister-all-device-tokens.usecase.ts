import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/device-token.repository';

export interface UnregisterAllDeviceTokensParams {
  userId: string;
}

/**
 * Unregister All Device Tokens Use Case
 *
 * Deactivates all device tokens for a user.
 * Typically used when a user logs out from all devices
 * or wants to stop all push notifications.
 */
@Injectable()
export class UnregisterAllDeviceTokensUseCase {
  private readonly logger = new Logger(UnregisterAllDeviceTokensUseCase.name);

  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async execute(params: UnregisterAllDeviceTokensParams): Promise<void> {
    this.logger.log(
      `Unregistering all device tokens for user ${params.userId}`,
    );

    await this.deviceTokenRepository.deactivateAllForUser(params.userId);

    this.logger.log(
      `All device tokens deactivated successfully for user ${params.userId}`,
    );
  }
}
