/**
 * Test-Aware Throttler Guard
 *
 * Extends the default ThrottlerGuard to skip rate limiting when:
 * 1. NODE_ENV === 'development'
 * 2. Request includes header: X-Test-Bypass: <secret>
 *
 * The secret is configured via E2E_TEST_SECRET env var (defaults to 'korido-e2e-test-2026').
 * This header is IGNORED in production — rate limiting always applies.
 */
import { Injectable, ExecutionContext } from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';

@Injectable()
export class TestAwareThrottlerGuard extends ThrottlerGuard {
  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isDev = process.env.NODE_ENV === 'development';

    // In dev mode, check for test bypass header
    if (isDev) {
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
