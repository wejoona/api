import { Request } from 'express';
import axios, { AxiosRequestConfig } from 'axios';

/**
 * HTTP Client Helper for Correlation ID Propagation
 *
 * Utility functions to automatically include correlation ID in HTTP requests
 * to downstream services, ensuring end-to-end tracing.
 */

/**
 * Create axios config with correlation ID header
 *
 * @param correlationId - The correlation ID to propagate
 * @param config - Optional axios config to merge
 * @returns Axios config with X-Correlation-ID header
 *
 * @example
 * ```typescript
 * const config = withCorrelationId(req.correlationId);
 * const response = await axios.get('https://api.example.com/data', config);
 * ```
 */
export function withCorrelationId(
  correlationId: string,
  config?: AxiosRequestConfig,
): AxiosRequestConfig {
  return {
    ...config,
    headers: {
      ...config?.headers,
      'X-Correlation-ID': correlationId,
    },
  };
}

/**
 * Create axios config with correlation ID from request
 *
 * @param req - Express request object
 * @param config - Optional axios config to merge
 * @returns Axios config with X-Correlation-ID header
 *
 * @example
 * ```typescript
 * const config = withCorrelationIdFromRequest(req);
 * const response = await axios.post('https://api.example.com/data', data, config);
 * ```
 */
export function withCorrelationIdFromRequest(
  req: Request,
  config?: AxiosRequestConfig,
): AxiosRequestConfig {
  const correlationId = req['correlationId'] || 'unknown';
  return withCorrelationId(correlationId, config);
}

/**
 * Create an axios instance with correlation ID interceptor
 *
 * This creates an axios instance that automatically includes the correlation ID
 * in all outgoing requests.
 *
 * @param correlationId - The correlation ID to propagate
 * @param config - Optional default axios config
 * @returns Configured axios instance
 *
 * @example
 * ```typescript
 * const client = createCorrelatedHttpClient(req.correlationId, {
 *   baseURL: 'https://api.example.com',
 *   timeout: 5000,
 * });
 *
 * // All requests will include X-Correlation-ID
 * const response1 = await client.get('/users');
 * const response2 = await client.post('/orders', orderData);
 * ```
 */
export function createCorrelatedHttpClient(
  correlationId: string,
  config?: AxiosRequestConfig,
) {
  const client = axios.create(config);

  // Add request interceptor to inject correlation ID
  client.interceptors.request.use(
    (requestConfig) => {
      if (!requestConfig.headers) {
        requestConfig.headers = {} as any;
      }
      requestConfig.headers['X-Correlation-ID'] = correlationId;
      return requestConfig;
    },
    (error) => Promise.reject(error),
  );

  return client;
}

/**
 * Extract correlation ID from response headers
 *
 * Useful when receiving responses from services that propagate correlation IDs.
 *
 * @param headers - Response headers object
 * @returns Correlation ID if found, undefined otherwise
 *
 * @example
 * ```typescript
 * const response = await axios.get('https://api.example.com/data');
 * const correlationId = extractCorrelationIdFromHeaders(response.headers);
 * if (correlationId) {
 *   logger.log(`Response correlation ID: ${correlationId}`);
 * }
 * ```
 */
export function extractCorrelationIdFromHeaders(
  headers: Record<string, any>,
): string | undefined {
  return (
    headers['x-correlation-id'] ||
    headers['X-Correlation-ID'] ||
    headers['x-request-id'] ||
    headers['X-Request-ID']
  );
}
