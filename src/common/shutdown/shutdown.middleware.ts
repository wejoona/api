import {
  Injectable,
  NestMiddleware,
  ServiceUnavailableException,
} from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
import { ShutdownService } from './shutdown.service';

/**
 * Shutdown Middleware
 *
 * Tracks active requests and prevents new requests during shutdown.
 * Must be registered globally to track all incoming requests.
 */
@Injectable()
export class ShutdownMiddleware implements NestMiddleware {
  constructor(private readonly shutdownService: ShutdownService) {}

  use(req: Request, res: Response, next: NextFunction): void {
    // Reject new requests if shutting down
    if (this.shutdownService.isShutdown()) {
      throw new ServiceUnavailableException(
        'Server is shutting down. Please try again later.',
      );
    }

    // Track request lifecycle
    this.shutdownService.incrementActiveRequests();

    // Decrement counter when response finishes
    const cleanup = () => {
      this.shutdownService.decrementActiveRequests();
    };

    res.on('finish', cleanup);
    res.on('close', cleanup);
    res.on('error', cleanup);

    next();
  }
}
