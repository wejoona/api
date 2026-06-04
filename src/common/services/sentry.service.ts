import {
  Injectable,
  Logger,
  OnModuleInit,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import * as Sentry from '@sentry/node';
import { GlobalExceptionFilter } from '../filters/http-exception.filter';

@Injectable()
export class SentryService implements OnModuleInit {
  private readonly logger = new Logger(SentryService.name);
  private readonly dsn: string;
  private readonly enabled: boolean;

  constructor(private readonly configService: ConfigService) {
    this.dsn = this.configService.get<string>('SENTRY_DSN', '');
    this.enabled = !!this.dsn;
  }

  onModuleInit() {
    if (!this.enabled) {
      this.logger.log('Sentry disabled (no SENTRY_DSN configured)');
      return;
    }

    const nodeEnv = this.configService.get<string>('NODE_ENV', 'development');

    Sentry.init({
      dsn: this.dsn,
      environment: nodeEnv,
      tracesSampleRate: 0.2,
      sendDefaultPii: false,
    });

    this.logger.log(`Sentry initialized (env: ${nodeEnv})`);
  }

  captureException(exception: unknown): void {
    if (!this.enabled) return;
    Sentry.captureException(exception);
  }

  captureMessage(message: string, level: Sentry.SeverityLevel = 'info'): void {
    if (!this.enabled) return;
    Sentry.captureMessage(message, level);
  }

  setUser(user: { id: string; email?: string } | null): void {
    if (!this.enabled) return;
    Sentry.setUser(user);
  }

  addBreadcrumb(breadcrumb: Sentry.Breadcrumb): void {
    if (!this.enabled) return;
    Sentry.addBreadcrumb(breadcrumb);
  }
}

/**
 * Global exception filter that reports unhandled exceptions to Sentry while
 * preserving the normalized mobile/API error envelope.
 */
@Catch()
export class SentryExceptionFilter extends GlobalExceptionFilter {
  private static sentryService: SentryService;

  constructor(..._args: unknown[]) {
    super();
  }

  static initialize(sentryService: SentryService): void {
    SentryExceptionFilter.sentryService = sentryService;
  }

  catch(exception: unknown, host: ArgumentsHost): void {
    // Don't report client errors (4xx) to Sentry — only server errors
    const isClientError =
      exception instanceof HttpException && exception.getStatus() < 500;

    if (!isClientError && SentryExceptionFilter.sentryService) {
      SentryExceptionFilter.sentryService.captureException(exception);
    }

    super.catch(exception, host);
  }
}
