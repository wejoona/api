import { createParamDecorator, ExecutionContext } from '@nestjs/common';
import { RequestContext } from './request-context.interface';

/**
 * Request Context Decorator
 *
 * Injects the current request context into controller methods.
 * Alternative to using RequestContextService in controllers.
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getProfile(@ReqContext() context: RequestContext) {
 *   const userId = context.user?.id;
 *   const ip = context.metadata.ip;
 *   // ...
 * }
 * ```
 */
export const ReqContext = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): RequestContext | undefined => {
    const request = ctx.switchToHttp().getRequest();
    // Context is available via AsyncLocalStorage, but we can also attach it to request
    return request.context;
  },
);

/**
 * User Decorator
 *
 * Extracts just the user from request context.
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getProfile(@CurrentUser() user: RequestUser) {
 *   return this.userService.findById(user.id);
 * }
 * ```
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.user;
  },
);

/**
 * Correlation ID Decorator
 *
 * Extracts just the correlation ID from request context.
 *
 * Usage:
 * ```typescript
 * @Get()
 * async getData(@CorrelationId() correlationId: string) {
 *   this.logger.log(`Processing request ${correlationId}`);
 * }
 * ```
 */
export const CorrelationId = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    return (
      request.headers['x-correlation-id'] ||
      request.headers['x-request-id'] ||
      'unknown'
    );
  },
);

/**
 * Client IP Decorator
 *
 * Extracts client IP address from request.
 *
 * Usage:
 * ```typescript
 * @Post()
 * async login(@ClientIp() ip: string) {
 *   this.auditService.logLogin(userId, ip);
 * }
 * ```
 */
export const ClientIp = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): string => {
    const request = ctx.switchToHttp().getRequest();
    const forwardedFor = request.headers['x-forwarded-for'] as string;
    if (forwardedFor) {
      return forwardedFor.split(',')[0].trim();
    }
    return (
      request.headers['x-real-ip'] ||
      request.ip ||
      request.socket?.remoteAddress ||
      'unknown'
    );
  },
);

/**
 * Device Decorator
 *
 * Extracts device information from request.
 *
 * Usage:
 * ```typescript
 * @Post()
 * async registerDevice(@Device() device: RequestDevice) {
 *   return this.deviceService.register(device);
 * }
 * ```
 */
export const Device = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext) => {
    const request = ctx.switchToHttp().getRequest();
    return request.device;
  },
);
