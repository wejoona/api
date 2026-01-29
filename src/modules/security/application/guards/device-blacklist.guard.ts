import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { DeviceBlacklistService } from '../services/device-blacklist.service';
import * as crypto from 'crypto';

export const SKIP_DEVICE_CHECK = 'skipDeviceCheck';

/**
 * Decorator to skip device blacklist check on specific endpoints
 */
export const SkipDeviceCheck = () => {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      SKIP_DEVICE_CHECK,
      true,
      descriptor?.value || target,
    );
    return descriptor || target;
  };
};

/**
 * Guard that checks if the requesting device is blacklisted
 * Extracts device identifiers from request headers and checks against blacklist
 */
@Injectable()
export class DeviceBlacklistGuard implements CanActivate {
  private readonly logger = new Logger(DeviceBlacklistGuard.name);

  constructor(
    private readonly blacklistService: DeviceBlacklistService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    // Check if endpoint is marked to skip device check
    const skipCheck = this.reflector.get<boolean>(
      SKIP_DEVICE_CHECK,
      context.getHandler(),
    );

    if (skipCheck) {
      return true;
    }

    const request = context.switchToHttp().getRequest();
    const identifiers = this.extractDeviceIdentifiers(request);

    // If no identifiers could be extracted, allow request (fail-open for accessibility)
    // In stricter mode, you might want to block requests without identifiers
    if (
      !identifiers.deviceId &&
      !identifiers.fingerprint &&
      !identifiers.ipAddress
    ) {
      this.logger.warn('No device identifiers found in request');
      return true;
    }

    const result =
      await this.blacklistService.checkMultipleIdentifiers(identifiers);

    if (result.isBlacklisted) {
      this.logger.warn(
        `Blocked request from blacklisted device: ${JSON.stringify(identifiers)}`,
      );

      throw new ForbiddenException({
        statusCode: 403,
        message: 'Access denied. This device has been blocked.',
        error: 'DEVICE_BLACKLISTED',
      });
    }

    // Attach device info to request for logging/auditing
    request.deviceInfo = identifiers;

    return true;
  }

  /**
   * Extract device identifiers from request
   */
  private extractDeviceIdentifiers(request: any): {
    deviceId?: string;
    ipAddress?: string;
    fingerprint?: string;
    userAgent?: string;
  } {
    const headers = request.headers;

    // Get device ID from custom header (set by mobile app)
    const deviceId =
      headers['x-device-id'] || headers['x-android-id'] || headers['x-idfv'];

    // Get IP address (handle proxies)
    const ipAddress = this.getClientIp(request);

    // Get user agent
    const userAgent = headers['user-agent'];

    // Generate fingerprint from available data
    const fingerprint = this.generateFingerprint({
      userAgent,
      acceptLanguage: headers['accept-language'],
      acceptEncoding: headers['accept-encoding'],
      // Add more browser/device characteristics as needed
    });

    return {
      deviceId: deviceId || undefined,
      ipAddress: ipAddress || undefined,
      fingerprint: fingerprint || undefined,
      userAgent: userAgent ? this.hashString(userAgent) : undefined,
    };
  }

  /**
   * Get real client IP, considering proxies
   */
  private getClientIp(request: any): string | undefined {
    // Check for forwarded IP (from load balancer/proxy)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      // Take the first IP in the chain (original client)
      const ips = forwarded.split(',').map((ip: string) => ip.trim());
      return ips[0];
    }

    // Check for real IP header (Nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return realIp;
    }

    // Fall back to connection remote address
    return request.ip || request.connection?.remoteAddress;
  }

  /**
   * Generate a fingerprint hash from device characteristics
   */
  private generateFingerprint(
    characteristics: Record<string, string | undefined>,
  ): string | undefined {
    const relevantChars = Object.entries(characteristics)
      .filter(([_, value]) => value)
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([key, value]) => `${key}:${value}`)
      .join('|');

    if (!relevantChars) {
      return undefined;
    }

    return this.hashString(relevantChars);
  }

  /**
   * Create SHA-256 hash of a string
   */
  private hashString(input: string): string {
    return crypto
      .createHash('sha256')
      .update(input)
      .digest('hex')
      .substring(0, 32);
  }
}
