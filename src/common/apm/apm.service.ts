import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

/**
 * APM (Application Performance Monitoring) Service
 *
 * This service provides a unified interface for APM providers
 * Compatible with New Relic, Datadog, and other APM solutions
 *
 * To use:
 * 1. Install provider: npm install newrelic OR npm install dd-trace
 * 2. Set environment variables:
 *    - APM_ENABLED=true
 *    - APM_PROVIDER=newrelic|datadog
 *    - NEW_RELIC_LICENSE_KEY=xxx (for New Relic)
 *    - DD_API_KEY=xxx (for Datadog)
 */
@Injectable()
export class ApmService implements OnModuleInit {
  private readonly logger = new Logger('ApmService');
  private apmProvider: any;
  private enabled: boolean;
  private provider: string;

  constructor(private readonly configService: ConfigService) {
    this.enabled = this.configService.get<boolean>('apm.enabled', false);
    this.provider = this.configService.get<string>('apm.provider', 'none');
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('APM is disabled');
      return;
    }

    try {
      this.initializeProvider();
    } catch (error) {
      this.logger.error('Failed to initialize APM provider', error);
    }
  }

  /**
   * Start a custom transaction
   */
  startTransaction(name: string, type: string = 'custom'): any {
    if (!this.enabled || !this.apmProvider) {
      return null;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          return this.apmProvider.startWebTransaction(name);
        case 'datadog':
          return this.apmProvider.startSpan(type, { resource: name });
        default:
          return null;
      }
    } catch (error) {
      this.logger.error('Failed to start transaction', error);
      return null;
    }
  }

  /**
   * End a custom transaction
   */
  endTransaction(transaction: any): void {
    if (!this.enabled || !transaction) {
      return;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          transaction.end();
          break;
        case 'datadog':
          transaction.finish();
          break;
      }
    } catch (error) {
      this.logger.error('Failed to end transaction', error);
    }
  }

  /**
   * Record a custom metric
   */
  recordMetric(name: string, value: number, unit?: string): void {
    if (!this.enabled || !this.apmProvider) {
      return;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          this.apmProvider.recordMetric(name, value);
          break;
        case 'datadog':
          // Datadog uses DogStatsD for metrics
          this.logger.debug(`Metric: ${name}=${value}${unit || ''}`);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to record metric', error);
    }
  }

  /**
   * Record a custom event
   */
  recordEvent(eventType: string, attributes: Record<string, any>): void {
    if (!this.enabled || !this.apmProvider) {
      return;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          this.apmProvider.recordCustomEvent(eventType, attributes);
          break;
        case 'datadog':
          this.logger.debug(`Event: ${eventType}`, attributes);
          break;
      }
    } catch (error) {
      this.logger.error('Failed to record event', error);
    }
  }

  /**
   * Add custom attributes to current transaction
   */
  addCustomAttributes(attributes: Record<string, any>): void {
    if (!this.enabled || !this.apmProvider) {
      return;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          for (const [key, value] of Object.entries(attributes)) {
            this.apmProvider.addCustomAttribute(key, value);
          }
          break;
        case 'datadog':
          const span = this.apmProvider.scope().active();
          if (span) {
            for (const [key, value] of Object.entries(attributes)) {
              span.setTag(key, value);
            }
          }
          break;
      }
    } catch (error) {
      this.logger.error('Failed to add custom attributes', error);
    }
  }

  /**
   * Notice an error
   */
  noticeError(error: Error, customAttributes?: Record<string, any>): void {
    if (!this.enabled || !this.apmProvider) {
      return;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          this.apmProvider.noticeError(error, customAttributes);
          break;
        case 'datadog':
          const span = this.apmProvider.scope().active();
          if (span) {
            span.setTag('error', true);
            span.setTag('error.message', error.message);
            span.setTag('error.stack', error.stack);
            if (customAttributes) {
              for (const [key, value] of Object.entries(customAttributes)) {
                span.setTag(key, value);
              }
            }
          }
          break;
      }
    } catch (err) {
      this.logger.error('Failed to notice error', err);
    }
  }

  /**
   * Set user context for current transaction
   */
  setUser(userId: string, email?: string, name?: string): void {
    if (!this.enabled || !this.apmProvider) {
      return;
    }

    try {
      switch (this.provider) {
        case 'newrelic':
          this.apmProvider.setUserID(userId);
          if (email) {
            this.apmProvider.addCustomAttribute('user.email', email);
          }
          if (name) {
            this.apmProvider.addCustomAttribute('user.name', name);
          }
          break;
        case 'datadog':
          const span = this.apmProvider.scope().active();
          if (span) {
            span.setTag('usr.id', userId);
            if (email) span.setTag('usr.email', email);
            if (name) span.setTag('usr.name', name);
          }
          break;
      }
    } catch (error) {
      this.logger.error('Failed to set user context', error);
    }
  }

  /**
   * Track an external API call
   */
  trackExternalCall(
    provider: string,
    endpoint: string,
    method: string,
    duration: number,
    statusCode: number,
  ): void {
    if (!this.enabled) {
      return;
    }

    this.recordMetric(`external_api.${provider}.duration`, duration, 'ms');
    this.recordEvent('ExternalApiCall', {
      provider,
      endpoint,
      method,
      duration,
      statusCode,
    });
  }

  private initializeProvider(): void {
    switch (this.provider) {
      case 'newrelic':
        this.initializeNewRelic();
        break;
      case 'datadog':
        this.initializeDatadog();
        break;
      default:
        this.logger.warn(`Unknown APM provider: ${this.provider}`);
    }
  }

  private initializeNewRelic(): void {
    try {
      // New Relic should be required at the very top of the application
      // This is a fallback initialization
      this.apmProvider = require('newrelic');
      this.logger.log('New Relic APM initialized');
    } catch (error) {
      this.logger.error(
        'Failed to initialize New Relic. Install with: npm install newrelic',
        error,
      );
      this.enabled = false;
    }
  }

  private initializeDatadog(): void {
    try {
      // Datadog tracer initialization
      this.apmProvider = require('dd-trace');
      this.apmProvider.init({
        service: this.configService.get<string>('apm.serviceName', 'usdc-wallet'),
        env: this.configService.get<string>('env', 'production'),
        version: this.configService.get<string>('version', '1.0.0'),
        logInjection: true,
      });
      this.logger.log('Datadog APM initialized');
    } catch (error) {
      this.logger.error(
        'Failed to initialize Datadog. Install with: npm install dd-trace',
        error,
      );
      this.enabled = false;
    }
  }

  /**
   * Get provider status
   */
  getStatus(): {
    enabled: boolean;
    provider: string;
    initialized: boolean;
  } {
    return {
      enabled: this.enabled,
      provider: this.provider,
      initialized: !!this.apmProvider,
    };
  }
}
