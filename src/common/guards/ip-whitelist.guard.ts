import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * IP Whitelist Guard
 * Restricts access to admin endpoints by IP address.
 * Configure via ADMIN_IP_WHITELIST env var (comma-separated).
 * If not configured, allows all (dev mode).
 */
@Injectable()
export class IpWhitelistGuard implements CanActivate {
  private readonly logger = new Logger(IpWhitelistGuard.name);
  private readonly whitelist: string[];

  constructor(private readonly configService: ConfigService) {
    const ips = this.configService.get<string>('ADMIN_IP_WHITELIST', '');
    this.whitelist = ips ? ips.split(',').map((ip) => ip.trim()) : [];
  }

  canActivate(context: ExecutionContext): boolean {
    if (this.whitelist.length === 0) {
      return true; // No whitelist configured = allow all (dev)
    }

    const request = context.switchToHttp().getRequest();
    const clientIp =
      request.headers['x-forwarded-for']?.split(',')[0]?.trim() ||
      request.ip ||
      request.connection?.remoteAddress;

    if (!this.whitelist.includes(clientIp)) {
      this.logger.warn(`Blocked admin access from IP: ${clientIp}`);
      throw new ForbiddenException('Access denied from this IP address');
    }

    return true;
  }
}
