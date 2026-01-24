import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  DeviceTokenRepository,
  DEVICE_TOKEN_REPOSITORY,
} from '@modules/notification/infrastructure/repositories/device-token.repository';

export interface UnregisterDeviceTokenParams {
  token: string;
}

/**
 * Unregister Device Token Use Case
 *
 * Deactivates a device token when a user logs out or
 * uninstalls the app.
 */
@Injectable()
export class UnregisterDeviceTokenUseCase {
  private readonly logger = new Logger(UnregisterDeviceTokenUseCase.name);

  constructor(
    @Inject(DEVICE_TOKEN_REPOSITORY)
    private readonly deviceTokenRepository: DeviceTokenRepository,
  ) {}

  async execute(params: UnregisterDeviceTokenParams): Promise<void> {
    this.logger.log(`Unregistering device token`);

    await this.deviceTokenRepository.deactivateToken(params.token);

    this.logger.log(`Device token deactivated successfully`);
  }
}
