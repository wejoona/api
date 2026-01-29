/**
 * Secure Fetch Utility with Timeout and Circuit Breaker
 *
 * Provides resilient HTTP client wrapper with:
 * - Request timeouts (prevents hanging connections)
 * - Circuit breaker integration (prevents cascading failures)
 * - Proper error handling and logging
 *
 * Security Benefits:
 * - Prevents resource exhaustion from slow/unresponsive external APIs
 * - Implements fail-fast pattern for degraded services
 * - Reduces attack surface during outages
 *
 * @see OWASP API Security Top 10 - API4:2023 Unrestricted Resource Consumption
 */

import { Logger } from '@nestjs/common';
import {
  CircuitBreaker,
  CircuitBreakerOptions,
  CircuitOpenError,
} from './circuit-breaker';

export interface SecureFetchOptions extends RequestInit {
  /** Timeout in milliseconds (default: 5000) */
  timeout?: number;
  /** Circuit breaker instance (optional) */
  circuitBreaker?: CircuitBreaker;
  /** Logger instance for error reporting */
  logger?: Logger;
}

export interface SecureFetchResult<T> {
  data: T;
  status: number;
  headers: Headers;
}

/**
 * Error thrown when a request times out
 */
export class RequestTimeoutError extends Error {
  readonly timeout: number;
  readonly url: string;

  constructor(url: string, timeout: number) {
    super(`Request to ${url} timed out after ${timeout}ms`);
    this.name = 'RequestTimeoutError';
    this.timeout = timeout;
    this.url = url;
  }
}

/**
 * Error thrown for external API failures
 */
export class ExternalApiError extends Error {
  readonly status: number;
  readonly url: string;
  readonly responseBody?: string;

  constructor(
    url: string,
    status: number,
    message: string,
    responseBody?: string,
  ) {
    super(message);
    this.name = 'ExternalApiError';
    this.status = status;
    this.url = url;
    this.responseBody = responseBody;
  }
}

/**
 * Execute a fetch request with timeout protection
 *
 * @param url The URL to fetch
 * @param options Fetch options including timeout
 * @returns The fetch Response
 * @throws RequestTimeoutError if request times out
 */
export async function fetchWithTimeout(
  url: string,
  options: SecureFetchOptions = {},
): Promise<Response> {
  const { timeout = 5000, logger, ...fetchOptions } = options;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeout);

  try {
    const response = await fetch(url, {
      ...fetchOptions,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
    return response;
  } catch (error) {
    clearTimeout(timeoutId);

    if (error instanceof Error && error.name === 'AbortError') {
      const timeoutError = new RequestTimeoutError(url, timeout);
      logger?.error(`External API timeout: ${url} after ${timeout}ms`);
      throw timeoutError;
    }

    // Log and rethrow other errors
    if (logger && error instanceof Error) {
      logger.error(`External API error: ${error.message}`);
    }
    throw error;
  }
}

/**
 * Execute a fetch request with timeout and circuit breaker protection
 *
 * @param url The URL to fetch
 * @param options Fetch options including timeout and circuit breaker
 * @returns The fetch Response
 * @throws RequestTimeoutError if request times out
 * @throws CircuitOpenError if circuit breaker is open
 */
export async function secureFetch(
  url: string,
  options: SecureFetchOptions = {},
): Promise<Response> {
  const { circuitBreaker, ...fetchOptions } = options;

  if (circuitBreaker) {
    return circuitBreaker.execute(() => fetchWithTimeout(url, fetchOptions));
  }

  return fetchWithTimeout(url, fetchOptions);
}

/**
 * Create a configured secure fetch function for a specific service
 *
 * @param serviceName Name of the external service (for logging)
 * @param defaultOptions Default options to apply to all requests
 * @returns Configured secure fetch function
 */
export function createSecureFetcher(
  serviceName: string,
  defaultOptions: {
    timeout?: number;
    circuitBreakerOptions?: CircuitBreakerOptions;
    logger?: Logger;
  } = {},
): {
  fetch: (url: string, options?: SecureFetchOptions) => Promise<Response>;
  circuitBreaker: CircuitBreaker;
} {
  const circuitBreaker = new CircuitBreaker({
    name: serviceName,
    ...defaultOptions.circuitBreakerOptions,
  });

  const logger =
    defaultOptions.logger ?? new Logger(`SecureFetch:${serviceName}`);

  return {
    fetch: (url: string, options: SecureFetchOptions = {}) =>
      secureFetch(url, {
        timeout: defaultOptions.timeout ?? 5000,
        circuitBreaker,
        logger,
        ...options,
      }),
    circuitBreaker,
  };
}

/**
 * Helper to safely mask sensitive data in URLs for logging
 * Masks API keys, tokens, and other sensitive query parameters
 */
export function maskUrlForLogging(url: string): string {
  try {
    const parsed = new URL(url);
    const sensitiveParams = [
      'api_key',
      'apikey',
      'token',
      'secret',
      'password',
      'key',
    ];

    for (const param of sensitiveParams) {
      if (parsed.searchParams.has(param)) {
        parsed.searchParams.set(param, '***MASKED***');
      }
    }

    return parsed.toString();
  } catch {
    // If URL parsing fails, return a generic masked version
    return url.replace(
      /([?&](api_key|apikey|token|secret|password|key)=)[^&]*/gi,
      '$1***MASKED***',
    );
  }
}
