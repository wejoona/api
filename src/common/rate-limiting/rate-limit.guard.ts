import {
  Injectable,
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request, Response } from 'express';
import { RateLimitService } from './rate-limit.service';
import { RATE_LIMIT_KEY, RateLimitConfig } from './rate-limit.decorator';

/**
 * Guard that enforces rate limiting based on decorator configuration.
 * Applies endpoint-specific limits and adds standard rate limit headers.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly logger = new Logger(RateLimitGuard.name);

  // Default rate limit if not specified by decorator
  private readonly defaultConfig: RateLimitConfig = {
    limit!: 100,
    windowSeconds: 60,
    byIp: false,
  };

  constructor(
    private readonly reflector: Reflector,
    private readonly rateLimitService: RateLimitService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<Request>();
    const response = context.switchToHttp().getResponse<Response>();

    // Get rate limit config from decorator (handler first, then class)
    const config =
      this.reflector.getAllAndOverride<RateLimitConfig>(RATE_LIMIT_KEY, [
        context.getHandler(),
        context.getClass(),
      ]) || this.defaultConfig;

    // Skip if explicitly disabled
    if (config.skip) {
      return true;
    }

    // Determine the key for rate limiting
    const key = this.buildKey(request, config, context);

    // Check rate limit
    const result = await this.rateLimitService.consume(
      key,
      config.limit,
      config.windowSeconds,
    );

    // Set rate limit headers
    this.setRateLimitHeaders(response, result);

    if (!result.allowed) {
      const retryAfter = Math.max(
        0,
        result.resetAt - Math.floor(Date.now() / 1000),
      );
      response.setHeader('Retry-After', retryAfter.toString());

      this.logger.warn(
        `Rate limit exceeded for ${key}: ${result.limit} requests per ${config.windowSeconds}s`,
      );

      throw new HttpException(
        {
          statusCode!: HttpStatus.TOO_MANY_REQUESTS,
          message: 'Too many requests. Please try again later.',
          error: 'Too Many Requests',
          retryAfter,
        },
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }

    return true;
  }

  /**
   * Build the rate limit key based on configuration.
   */
  private buildKey(
    request: Request,
    config: RateLimitConfig,
    context: ExecutionContext,
  ): string {
    const endpoint = config.keyPrefix || this.getEndpointKey(context);

    if (config.byIp) {
      const ip = this.getClientIp(request);
      return this.rateLimitService.getIpKey(ip, endpoint);
    }

    // Try to get user from request (set by auth guard)
    const user = (request as any).user;
    if (user?.id) {
      return this.rateLimitService.getUserKey(user.id, endpoint);
    }

    // Fall back to IP if no user
    const ip = this.getClientIp(request);
    return this.rateLimitService.getIpKey(ip, endpoint);
  }

  /**
   * Get the endpoint key from the execution context.
   */
  private getEndpointKey(context: ExecutionContext): string {
    const className = context.getClass().name;
    const methodName = context.getHandler().name;
    return `${className}:${methodName}`;
  }

  /**
   * Extract client IP address, handling proxies.
   */
  private getClientIp(request: Request): string {
    // Check X-Forwarded-For header (set by proxies/load balancers)
    const forwarded = request.headers['x-forwarded-for'];
    if (forwarded) {
      const ips =
        typeof forwarded === 'string' ? forwarded.split(',') : forwarded;
      return ips[0].trim();
    }

    // Check X-Real-IP header (set by nginx)
    const realIp = request.headers['x-real-ip'];
    if (realIp) {
      return typeof realIp === 'string' ? realIp : realIp[0];
    }

    // Fall back to request IP
    return request.ip || request.socket.remoteAddress || 'unknown';
  }

  /**
   * Set standard rate limit headers on the response.
   */
  private setRateLimitHeaders(
    response: Response,
    result: { limit: number; remaining: number; resetAt: number },
  ): void {
    response.setHeader('X-RateLimit-Limit', result.limit.toString());
    response.setHeader('X-RateLimit-Remaining', result.remaining.toString());
    response.setHeader('X-RateLimit-Reset', result.resetAt.toString());
  }
}
