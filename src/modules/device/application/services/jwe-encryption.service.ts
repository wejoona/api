import {
  Injectable,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { CompactEncrypt, importJWK } from 'jose';
import { DeviceRepository } from '../../domain/repositories/device.repository';

/**
 * JWE Encryption Service
 *
 * Encrypts sensitive data for a specific device using its registered public key.
 * Uses ECDH-ES+A256KW key agreement with A256GCM content encryption.
 *
 * Use cases:
 * - Wallet recovery data
 * - Sensitive configuration delivery
 * - Encrypted tokens for specific devices
 */
@Injectable()
export class JweEncryptionService {
  private readonly logger = new Logger(JweEncryptionService.name);

  constructor(private readonly deviceRepository: DeviceRepository) {}

  /**
   * Encrypt a payload for a specific device.
   *
   * @param userId - The user who owns the device
   * @param deviceId - The target device ID
   * @param payload - The data to encrypt (will be JSON-serialized)
   * @returns JWE compact serialization string
   */
  async encryptForDevice(
    userId: string,
    deviceId: string,
    payload: Record<string, unknown>,
  ): Promise<string> {
    const device = await this.deviceRepository.findById(deviceId);

    if (!device) {
      throw new NotFoundException('Device not found.');
    }

    if (device.userId !== userId) {
      throw new NotFoundException('Device not found for this user.');
    }

    if (!device.isActive) {
      throw new NotFoundException('Device has been revoked.');
    }

    if (!device.publicKeyJwk) {
      throw new NotFoundException(
        'Device has no registered public key for encryption.',
      );
    }

    const publicKey = await importJWK(device.publicKeyJwk as any, 'ECDH-ES+A256KW');

    const plaintext = new TextEncoder().encode(JSON.stringify(payload));

    const jwe = await new CompactEncrypt(plaintext)
      .setProtectedHeader({
        alg: 'ECDH-ES+A256KW',
        enc: 'A256GCM',
        kid: deviceId,
      })
      .encrypt(publicKey);

    this.logger.debug(
      `Encrypted payload for device ${deviceId}, user ${userId}`,
    );

    return jwe;
  }

  /**
   * Encrypt a payload for all active devices of a user.
   *
   * @param userId - The user ID
   * @param payload - The data to encrypt
   * @returns Map of deviceId → JWE compact token
   */
  async encryptForAllDevices(
    userId: string,
    payload: Record<string, unknown>,
  ): Promise<Map<string, string>> {
    const devices = await this.deviceRepository.findActiveByUserId(userId);
    const results = new Map<string, string>();

    for (const device of devices) {
      if (device.publicKeyJwk) {
        try {
          const jwe = await this.encryptForDevice(userId, device.id, payload);
          results.set(device.id, jwe);
        } catch (error) {
          this.logger.warn(
            `Failed to encrypt for device ${device.id}: ${error instanceof Error ? error.message : 'Unknown'}`,
          );
        }
      }
    }

    return results;
  }
}
