import { Logger } from '@nestjs/common';

const logger = new Logger('RetryUtil');

/**
 * Retry a function with exponential backoff.
 * @param fn Function to retry
 * @param maxRetries Maximum retries (default 3)
 * @param baseDelay Base delay in ms (default 1000)
 */
export async function withRetry<T>(
  fn: () => Promise<T>,
  options?: {
    maxRetries?: number;
    baseDelay?: number;
    label?: string;
  },
): Promise<T> {
  const { maxRetries = 3, baseDelay = 1000, label = 'operation' } = options || {};

  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error) {
      if (attempt === maxRetries) {
        logger.error(`${label} failed after ${maxRetries + 1} attempts: ${error}`);
        throw error;
      }
      const delay = baseDelay * Math.pow(2, attempt);
      logger.warn(`${label} attempt ${attempt + 1} failed, retrying in ${delay}ms...`);
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  throw new Error(`${label} failed unexpectedly`);
}
