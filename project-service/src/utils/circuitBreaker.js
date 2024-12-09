// api-gateway/src/utils/circuitBreaker.js
const logger = require('../sidecars/logging/logger');
class CircuitBreaker {
  constructor(options = {}) {
    this.name = options.name || 'default';
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    this.failureThreshold = options.errorThreshold || 5;
    this.resetTimeout = options.resetTimeout || 30000;
    this.timeoutDuration = options.timeoutDuration || 5000;
    
    logger.info(`Circuit Breaker initialized: ${this.name}`);
  }

  async execute(action) {
    if (this.state === 'OPEN') {
      if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
        logger.info(`Circuit ${this.name} entering HALF-OPEN state`);
        this.state = 'HALF-OPEN';
      } else {
        const error = new Error(`Circuit breaker ${this.name} is OPEN`);
        error.name = 'CircuitBreakerError';
        error.circuitBreaker = this.name;
        throw error;
      }
    }

    try {
      const timeoutPromise = new Promise((_, reject) => {
        setTimeout(() => {
          reject(new Error(`Operation timed out for circuit ${this.name}`));
        }, this.timeoutDuration);
      });

      const result = await Promise.race([action(), timeoutPromise]);
      this.onSuccess();
      return result;

    } catch (error) {
      this.onFailure(error);
      throw error;
    }
  }

  onSuccess() {
    this.failureCount = 0;
    if (this.state === 'HALF-OPEN') {
      logger.info(`Circuit ${this.name} closing after successful test`);
      this.state = 'CLOSED';
    }
    this.successCount++;
  }

  onFailure(error) {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.failureThreshold) {
      logger.warn(`Circuit ${this.name} opening after ${this.failureCount} failures`);
      this.state = 'OPEN';
    }
    
    logger.error(`Circuit ${this.name} failure:`, error);
  }

  getState() {
    return {
      name: this.name,
      state: this.state,
      failureCount: this.failureCount,
      successCount: this.successCount,
      lastFailureTime: this.lastFailureTime
    };
  }

  reset() {
    this.state = 'CLOSED';
    this.failureCount = 0;
    this.successCount = 0;
    this.lastFailureTime = null;
    logger.info(`Circuit ${this.name} manually reset`);
  }
}

module.exports = CircuitBreaker;