import { Injectable, OnModuleDestroy, Logger } from '@nestjs/common';
import { DataSource } from 'typeorm';

@Injectable()
export class GracefulShutdownService implements OnModuleDestroy {
  private readonly logger = new Logger(GracefulShutdownService.name);

  constructor(private readonly dataSource: DataSource) {}

  async onModuleDestroy(): Promise<void> {
    this.logger.log('Graceful shutdown initiated...');
    if (this.dataSource.isInitialized) {
      await this.dataSource.destroy();
      this.logger.log('Database connections closed');
    }
    this.logger.log('Graceful shutdown complete');
  }
}
