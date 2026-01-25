import { Logger } from '@nestjs/common';
import { Logger as TypeOrmLogger, QueryRunner } from 'typeorm';

export class CustomTypeOrmLogger implements TypeOrmLogger {
  private readonly logger = new Logger('TypeORM');

  /**
   * Logs query and parameters used in it
   */
  logQuery(query: string, parameters?: any[], queryRunner?: QueryRunner) {
    if (process.env.NODE_ENV === 'development') {
      this.logger.debug(
        JSON.stringify({
          type: 'query',
          query: this.formatQuery(query),
          parameters,
        }),
      );
    }
  }

  /**
   * Logs query that is failed
   */
  logQueryError(
    error: string | Error,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    this.logger.error(
      JSON.stringify({
        type: 'query_error',
        error: error instanceof Error ? error.message : error,
        query: this.formatQuery(query),
        parameters,
        stack: error instanceof Error ? error.stack : undefined,
      }),
    );
  }

  /**
   * Logs query that is slow (execution time exceeds maxQueryExecutionTime)
   */
  logQuerySlow(
    time: number,
    query: string,
    parameters?: any[],
    queryRunner?: QueryRunner,
  ) {
    this.logger.warn(
      JSON.stringify({
        type: 'slow_query',
        executionTime: `${time}ms`,
        query: this.formatQuery(query),
        parameters,
        threshold: '1000ms',
        recommendation: 'Consider adding indexes or optimizing query',
      }),
    );
  }

  /**
   * Logs events from the schema build process
   */
  logSchemaBuild(message: string, queryRunner?: QueryRunner) {
    this.logger.log(
      JSON.stringify({
        type: 'schema_build',
        message,
      }),
    );
  }

  /**
   * Logs events from the migrations run process
   */
  logMigration(message: string, queryRunner?: QueryRunner) {
    this.logger.log(
      JSON.stringify({
        type: 'migration',
        message,
      }),
    );
  }

  /**
   * Perform logging using given logger, or by default to the console
   */
  log(
    level: 'log' | 'info' | 'warn',
    message: any,
    queryRunner?: QueryRunner,
  ) {
    switch (level) {
      case 'log':
      case 'info':
        this.logger.log(message);
        break;
      case 'warn':
        this.logger.warn(message);
        break;
    }
  }

  /**
   * Format query for better readability
   */
  private formatQuery(query: string): string {
    return query
      .replace(/\s+/g, ' ') // Replace multiple spaces with single space
      .trim();
  }
}
