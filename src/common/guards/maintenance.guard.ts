import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ServiceUnavailableException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

@Injectable()
export class MaintenanceGuard implements CanActivate {
  constructor(private readonly configService: ConfigService) {}

  canActivate(context: ExecutionContext): boolean {
    const isMaintenanceMode = this.configService.get<string>('MAINTENANCE_MODE') === 'true';
    if (isMaintenanceMode) {
      const request = context.switchToHttp().getRequest();
      // Always allow health checks
      if (request.url.startsWith('/health') || request.url.startsWith('/api/v1/health')) {
        return true;
      }
      throw new ServiceUnavailableException({
        statusCode: 503,
        error: 'Service Unavailable',
        message: 'Korido is currently under maintenance. Please try again later.',
        estimatedReturn: this.configService.get<string>('MAINTENANCE_END_TIME'),
      });
    }
    return true;
  }
}
