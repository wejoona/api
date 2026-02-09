import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
  Logger,
} from '@nestjs/common';
import { Request } from 'express';
import { compactVerify, importJWK } from 'jose';
import { DeviceRepository } from '../../domain/repositories/device.repository';

/**
 * JWS Device Guard
 *
 * Verifies JWS (JSON Web Signature) on sensitive endpoints.
 * The client signs the request body (or a canonical payload) with its device private key.
 *
 * Expected headers:
 *   X-Device-JWS: <compact JWS token>
 *
 * The JWS protected header must contain:
 *   kid: <deviceId (UUID)>
 *   alg: ES256
 *
 * The guard:
 * 1. Extracts the JWS from the X-Device-JWS header
 * 2. Decodes the protected header to get the deviceId (kid)
 * 3. Looks up the device's public key from the database
 * 4. Verifies the device belongs to the authenticated user
 * 5. Verifies the JWS signature
 * 6. Attaches the verified deviceId to request for downstream use
 */
@Injectable()
export class JwsDeviceGuard implements CanActivate {
  private readonly logger = new Logger(JwsDeviceGuard.name);

  constructor(private readonly deviceRepository: DeviceRepository) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const jwsToken = request.headers['x-device-jws'] as string | undefined;

    if (!jwsToken) {
      throw new UnauthorizedException(
        'Missing X-Device-JWS header. Device signature required for this operation.',
      );
    }

    // Extract the user from the JWT (set by JwtAuthGuard which should run first)
    const user = (request as any).user;
    if (!user?.id) {
      throw new UnauthorizedException(
        'Authentication required before device verification.',
      );
    }

    try {
      // Decode the protected header to get the kid (deviceId)
      const parts = jwsToken.split('.');
      if (parts.length !== 3) {
        throw new UnauthorizedException('Invalid JWS format.');
      }

      const protectedHeader = JSON.parse(
        Buffer.from(parts[0], 'base64url').toString('utf-8'),
      );

      const deviceId = protectedHeader.kid;
      if (!deviceId) {
        throw new UnauthorizedException(
          'JWS protected header must contain kid (device ID).',
        );
      }

      if (protectedHeader.alg !== 'ES256') {
        throw new UnauthorizedException(
          'JWS algorithm must be ES256 (ECDSA P-256).',
        );
      }

      // Look up device
      const device = await this.deviceRepository.findById(deviceId);
      if (!device) {
        throw new UnauthorizedException('Device not found.');
      }

      if (!device.isActive) {
        throw new UnauthorizedException('Device has been revoked.');
      }

      if (device.userId !== user.id) {
        throw new UnauthorizedException(
          'Device does not belong to authenticated user.',
        );
      }

      if (!device.publicKeyJwk) {
        throw new UnauthorizedException(
          'Device has no registered public key.',
        );
      }

      // Import the public key and verify the signature
      const publicKey = await importJWK(
        device.publicKeyJwk as any,
        'ES256',
      );

      await compactVerify(jwsToken, publicKey);

      // Attach verified deviceId to the request for downstream use
      (request as any).verifiedDeviceId = deviceId;
      (request as any).verifiedDevice = {
        id: device.id,
        deviceIdentifier: device.deviceIdentifier,
        userId: device.userId,
      };

      this.logger.debug(
        `JWS verified for device ${deviceId}, user ${user.id}`,
      );

      return true;
    } catch (error) {
      if (error instanceof UnauthorizedException) {
        throw error;
      }
      this.logger.warn(
        `JWS verification failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
      );
      throw new UnauthorizedException('JWS signature verification failed.');
    }
  }
}
