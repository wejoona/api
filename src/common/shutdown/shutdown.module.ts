import { Module, Global } from '@nestjs/common';
import { ShutdownService } from './shutdown.service';

/**
 * Shutdown Module
 *
 * Provides graceful shutdown functionality across the application.
 * Made global so it can be injected anywhere without importing the module.
 */
@Global()
@Module({
  providers: [ShutdownService],
  exports: [ShutdownService],
})
export class ShutdownModule {}
