/**
 * Simple Circuit Breaker Implementation
 *
 * Provides fault tolerance for external API calls by preventing cascading failures.
 * Implements the circuit breaker pattern with three states:
 * - CLOSED: Normal operation, requests flow through
 * - OPEN: Circuit is tripped, requests fail fast
 * - HALF_OPEN: Testing if service has recovered
 *
 * Security Benefits:
 * - Prevents resource exhaustion from repeated failed calls
 * - Reduces attack surface during external service outages
 * - Provides graceful degradation
 *
 * @see OWASP API Security Top 10 - API4:2023 Unrestricted Resource Consumption
 */

export enum CircuitState {
  CLOSED = 'CLOSED',
  OPEN = 'OPEN',
  HALF_OPEN = 'HALF_OPEN',
}

export interface CircuitBreakerOptions {
  /** Number of consecutive failures before opening circuit (default: 5) */
  failureThreshold?: number;
  /** Time in milliseconds to wait before attempting recovery (default: 30000) */
  resetTimeout?: number;
  /** Name for logging purposes */
  name?: string;
}

export interface CircuitBreakerStats {
  state: CircuitState;
  failures: number;
  successes: number;
  lastFailureTime: Date | null;
  lastSuccessTime: Date | null;
}

export class CircuitBreaker {
  private state: CircuitState = CircuitState.CLOSED;
  private failures = 0;
  private successes = 0;
  private lastFailureTime: Date | null = null;
  private lastSuccessTime: Date | null = null;
  private nextAttemptTime: Date | null = null;

  private readonly failureThreshold: number;
  private readonly resetTimeout: number;
  private readonly name: string;

  constructor(options: CircuitBreakerOptions = {}) {
    this.failureThreshold = options.failureThreshold ?? 5;
    this.resetTimeout = options.resetTimeout ?? 30000; // 30 seconds
    this.name = options.name ?? 'default';
  }

  /**
   * Execute a function through the circuit breaker
   * @param fn The async function to execute
   * @returns The result of the function
   * @throws CircuitOpenError if circuit is open, or the original error from fn
   */
  async execute<T>(fn: () => Promise<T>): Promise<T> {
    if (!this.canExecute()) {
      throw new CircuitOpenError(
        `Circuit breaker '${this.name}' is open. Service temporarily unavailable.`,
        this.getTimeUntilNextAttempt(),
      );
    }

    try {
      const result = await fn();
      this.onSuccess();
      return result;
    } catch (error) {
      this.onFailure();
      throw error;
    }
  }

  /**
   * Check if a request can be executed
   */
  canExecute(): boolean {
    if (this.state === CircuitState.CLOSED) {
      return true;
    }

    if (this.state === CircuitState.OPEN) {
      // Check if reset timeout has elapsed
      if (this.nextAttemptTime && new Date() >= this.nextAttemptTime) {
        this.state = CircuitState.HALF_OPEN;
        return true;
      }
      return false;
    }

    // HALF_OPEN - allow one request to test
    return true;
  }

  /**
   * Record a successful execution
   */
  private onSuccess(): void {
    this.successes++;
    this.lastSuccessTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      // Service has recovered, close the circuit
      this.reset();
    }

    // In closed state, reset failure count on success
    if (this.state === CircuitState.CLOSED) {
      this.failures = 0;
    }
  }

  /**
   * Record a failed execution
   */
  private onFailure(): void {
    this.failures++;
    this.lastFailureTime = new Date();

    if (this.state === CircuitState.HALF_OPEN) {
      // Failed during recovery test, reopen circuit
      this.trip();
    } else if (
      this.state === CircuitState.CLOSED &&
      this.failures >= this.failureThreshold
    ) {
      // Threshold exceeded, open circuit
      this.trip();
    }
  }

  /**
   * Trip the circuit breaker (open it)
   */
  private trip(): void {
    this.state = CircuitState.OPEN;
    this.nextAttemptTime = new Date(Date.now() + this.resetTimeout);
  }

  /**
   * Reset the circuit breaker to closed state
   */
  reset(): void {
    this.state = CircuitState.CLOSED;
    this.failures = 0;
    this.nextAttemptTime = null;
  }

  /**
   * Force the circuit open (for testing or manual intervention)
   */
  forceOpen(): void {
    this.trip();
  }

  /**
   * Get current circuit breaker statistics
   */
  getStats(): CircuitBreakerStats {
    return {
      state: this.state,
      failures: this.failures,
      successes: this.successes,
      lastFailureTime: this.lastFailureTime,
      lastSuccessTime: this.lastSuccessTime,
    };
  }

  /**
   * Get time in milliseconds until next attempt is allowed
   */
  private getTimeUntilNextAttempt(): number {
    if (!this.nextAttemptTime) {
      return 0;
    }
    return Math.max(0, this.nextAttemptTime.getTime() - Date.now());
  }

  /**
   * Get the current state
   */
  getState(): CircuitState {
    // Check if we should transition from OPEN to HALF_OPEN
    if (
      this.state === CircuitState.OPEN &&
      this.nextAttemptTime &&
      new Date() >= this.nextAttemptTime
    ) {
      this.state = CircuitState.HALF_OPEN;
    }
    return this.state;
  }
}

/**
 * Error thrown when circuit breaker is open
 */
export class CircuitOpenError extends Error {
  readonly retryAfterMs: number;

  constructor(message: string, retryAfterMs: number) {
    super(message);
    this.name = 'CircuitOpenError';
    this.retryAfterMs = retryAfterMs;
  }
}

/**
 * Registry to manage multiple circuit breakers
 * Useful for having separate breakers per external service
 */
export class CircuitBreakerRegistry {
  private static instance: CircuitBreakerRegistry;
  private readonly breakers = new Map<string, CircuitBreaker>();

  private constructor() {}

  static getInstance(): CircuitBreakerRegistry {
    if (!CircuitBreakerRegistry.instance) {
      CircuitBreakerRegistry.instance = new CircuitBreakerRegistry();
    }
    return CircuitBreakerRegistry.instance;
  }

  /**
   * Get or create a circuit breaker for a service
   */
  getBreaker(name: string, options?: CircuitBreakerOptions): CircuitBreaker {
    if (!this.breakers.has(name)) {
      this.breakers.set(name, new CircuitBreaker({ ...options, name }));
    }
    return this.breakers.get(name)!;
  }

  /**
   * Get all circuit breaker statistics
   */
  getAllStats(): Record<string, CircuitBreakerStats> {
    const stats: Record<string, CircuitBreakerStats> = {};
    this.breakers.forEach((breaker, name) => {
      stats[name] = breaker.getStats();
    });
    return stats;
  }

  /**
   * Reset all circuit breakers
   */
  resetAll(): void {
    this.breakers.forEach((breaker) => {
      breaker.reset();
    });
  }
}
