import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { Request, Response } from 'express';

/**
 * VersionHeaderInterceptor
 *
 * Adds API version headers to all responses for client awareness and debugging.
 *
 * Headers added:
 * - X-API-Version: The version of the endpoint that handled the request (e.g., "1", "2")
 * - X-API-Latest-Version: The latest available API version (currently "1")
 * - X-API-Deprecated: Set to "true" if the endpoint version is deprecated
 *
 * Usage:
 * Applied globally in main.ts via app.useGlobalInterceptors()
 */
@Injectable()
export class VersionHeaderInterceptor implements NestInterceptor {
  private readonly LATEST_VERSION = '1';
  private readonly DEPRECATED_VERSIONS: string[] = []; // Add deprecated versions here

  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    const ctx = context.switchToHttp();
    const request = ctx.getRequest<Request>();
    const response = ctx.getResponse<Response>();

    // Extract version from the request path
    // Format: /api/v1/... or /api/v2/...
    const version = this.extractVersionFromPath(request.path);

    return next.handle().pipe(
      map((data) => {
        // Add version headers to response
        response.setHeader('X-API-Version', version);
        response.setHeader('X-API-Latest-Version', this.LATEST_VERSION);

        // Mark deprecated versions
        if (this.DEPRECATED_VERSIONS.includes(version)) {
          response.setHeader('X-API-Deprecated', 'true');
          response.setHeader(
            'X-API-Deprecation-Info',
            `API version ${version} is deprecated. Please migrate to v${this.LATEST_VERSION}.`,
          );
        }

        return data;
      }),
    );
  }

  /**
   * Extracts version from request path
   * Examples:
   *  - /api/v1/wallet -> "1"
   *  - /api/v2/transactions -> "2"
   *  - /api/health -> "1" (defaults to latest)
   */
  private extractVersionFromPath(path: string): string {
    const versionMatch = path.match(/\/v(\d+)\//);
    return versionMatch ? versionMatch[1] : this.LATEST_VERSION;
  }
}
