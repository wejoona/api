/**
 * Test-Aware Throttler Guard
 *
 * Extends the default ThrottlerGuard to skip rate limiting when:
 * 1. NODE_ENV === 'test'
 * 2. NODE_ENV === 'development' and request includes header: X-Test-Bypass: <secret>
 *
 * The secret is configured via E2E_TEST_SECRET env var (defaults to 'korido-e2e-test-2026').
 * This header is IGNORED in production — rate limiting always applies.
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class TestAwareThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isTest = process.env.NODE_ENV === 'test';
    if (isTest && process.env.ENABLE_RATE_LIMITING_IN_TESTS !== 'true') {
      return true;
    }

    // In dev mode, check for test bypass header
    if (process.env.NODE_ENV === 'development') {
      const request = context.switchToHttp().getRequest();
      const bypassHeader = request.headers?.['x-test-bypass'];
      const testSecret = process.env.E2E_TEST_SECRET || 'korido-e2e-test-2026';
      if (bypassHeader === testSecret) {
        return true; // Skip throttle entirely
      }
    }

    // Normal throttle behavior
    return super.canActivate(context);
  }
}
