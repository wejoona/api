import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { ApiKeyService } from '../services/api-key.service';

export const API_KEY_PERMISSIONS_KEY = 'api_key_permissions';

/**
 * Decorator to specify required permissions for API key access
 */
export function RequireApiKeyPermissions(...permissions: string[]) {
  return (target: any, key?: string, descriptor?: PropertyDescriptor) => {
    Reflect.defineMetadata(
      API_KEY_PERMISSIONS_KEY,
      permissions,
      descriptor?.value ?? target,
    );
    return descriptor ?? target;
  };
}

/**
 * Guard that validates API key authentication
 * Expects the API key in the X-API-Key header or Authorization header (Bearer token)
 */
@Injectable()
export class ApiKeyAuthGuard implements CanActivate {
  constructor(
    private readonly apiKeyService: ApiKeyService,
    private readonly reflector: Reflector,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const apiKey = this.extractApiKey(request);

    if (!apiKey) {
      throw new UnauthorizedException('API key is required');
    }

    // Get client IP for whitelist validation
    const clientIp = this.getClientIp(request);

    // Validate the API key
    const validatedKey = await this.apiKeyService.validateApiKey(
      apiKey,
      clientIp,
    );

    // Check permissions if specified
    const requiredPermissions = this.reflector.get<string[]>(
      API_KEY_PERMISSIONS_KEY,
      context.getHandler(),
    );

    if (requiredPermissions && requiredPermissions.length > 0) {
      if (!validatedKey.hasAnyPermission(requiredPermissions)) {
        throw new UnauthorizedException(
          `Missing required permissions: ${requiredPermissions.join(', ')}`,
        );
      }
    }

    // Attach API key info to request for downstream use
    (request as any).apiKey = validatedKey;

    return true;
  }

  private extractApiKey(request: Request): string | null {
    // Try X-API-Key header first
    const xApiKey = request.headers['x-api-key'];
    if (xApiKey && typeof xApiKey === 'string') {
      return xApiKey;
    }

    // Try Authorization header with Bearer scheme
    const authHeader = request.headers.authorization;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const token = authHeader.substring(7);
      if (token.startsWith('jpk_')) {
        return token;
      }
    }

    return null;
  }

  private getClientIp(request: Request): string {
    // Check for forwarded IP headers (when behind proxy/load balancer)
    const forwardedFor = request.headers['x-forwarded-for'];
    if (forwardedFor) {
      const ips = (
        Array.isArray(forwardedFor) ? forwardedFor[0] : forwardedFor
      ).split(',');
      return ips[0].trim();
    }

    const realIp = request.headers['x-real-ip'];
    if (realIp && typeof realIp === 'string') {
      return realIp;
    }

    return request.ip || request.socket.remoteAddress || '';
  }
}
