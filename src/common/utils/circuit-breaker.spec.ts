import {
  CircuitBreaker,
  CircuitState,
  CircuitOpenError,
  CircuitBreakerRegistry,
} from './circuit-breaker';

describe('CircuitBreaker', () => {
  let circuitBreaker: CircuitBreaker;

  beforeEach(() => {
    circuitBreaker = new CircuitBreaker({
      name: 'test',
      failureThreshold: 3,
      resetTimeout: 100, // 100ms for testing
    });
  });

  describe('initial state', () => {
    it('should start in CLOSED state', () => {
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should allow execution when closed', () => {
      expect(circuitBreaker.canExecute()).toBe(true);
    });

    it('should have zero failures initially', () => {
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(0);
      expect(stats.successes).toBe(0);
    });
  });

  describe('successful execution', () => {
    it('should execute function and return result', async () => {
      const result = await circuitBreaker.execute(async () => 'success');
      expect(result).toBe('success');
    });

    it('should track successes', async () => {
      await circuitBreaker.execute(async () => 'success');
      const stats = circuitBreaker.getStats();
      expect(stats.successes).toBe(1);
    });

    it('should reset failure count on success', async () => {
      // Cause some failures first
      for (let i = 0; i < 2; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      // Success should reset failures
      await circuitBreaker.execute(async () => 'success');
      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(0);
    });
  });

  describe('failure handling', () => {
    it('should track failures', async () => {
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('test error');
        });
      } catch {
        // Expected
      }

      const stats = circuitBreaker.getStats();
      expect(stats.failures).toBe(1);
    });

    it('should open circuit after threshold failures', async () => {
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });

    it('should throw CircuitOpenError when open', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      await expect(
        circuitBreaker.execute(async () => 'should not run'),
      ).rejects.toThrow(CircuitOpenError);
    });
  });

  describe('recovery', () => {
    it('should transition to HALF_OPEN after reset timeout', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      expect(circuitBreaker.getState()).toBe(CircuitState.HALF_OPEN);
    });

    it('should close circuit on successful execution in HALF_OPEN', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Execute successfully
      await circuitBreaker.execute(async () => 'success');

      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
    });

    it('should reopen circuit on failure in HALF_OPEN', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      // Wait for reset timeout
      await new Promise((resolve) => setTimeout(resolve, 150));

      // Fail again
      try {
        await circuitBreaker.execute(async () => {
          throw new Error('test error');
        });
      } catch {
        // Expected
      }

      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });

  describe('manual controls', () => {
    it('should reset circuit breaker', async () => {
      // Trip the circuit
      for (let i = 0; i < 3; i++) {
        try {
          await circuitBreaker.execute(async () => {
            throw new Error('test error');
          });
        } catch {
          // Expected
        }
      }

      circuitBreaker.reset();
      expect(circuitBreaker.getState()).toBe(CircuitState.CLOSED);
      expect(circuitBreaker.getStats().failures).toBe(0);
    });

    it('should force open circuit', () => {
      circuitBreaker.forceOpen();
      expect(circuitBreaker.getState()).toBe(CircuitState.OPEN);
    });
  });
});

describe('CircuitBreakerRegistry', () => {
  let registry: CircuitBreakerRegistry;

  beforeEach(() => {
    registry = CircuitBreakerRegistry.getInstance();
    registry.resetAll();
  });

  it('should return singleton instance', () => {
    const instance1 = CircuitBreakerRegistry.getInstance();
    const instance2 = CircuitBreakerRegistry.getInstance();
    expect(instance1).toBe(instance2);
  });

  it('should create and cache circuit breakers', () => {
    const breaker1 = registry.getBreaker('service1');
    const breaker2 = registry.getBreaker('service1');
    expect(breaker1).toBe(breaker2);
  });

  it('should create separate breakers for different services', () => {
    const breaker1 = registry.getBreaker('service1');
    const breaker2 = registry.getBreaker('service2');
    expect(breaker1).not.toBe(breaker2);
  });

  it('should get all stats', () => {
    registry.getBreaker('service1');
    registry.getBreaker('service2');

    const stats = registry.getAllStats();
    expect(stats).toHaveProperty('service1');
    expect(stats).toHaveProperty('service2');
  });
});
