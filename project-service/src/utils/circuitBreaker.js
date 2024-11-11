// api-gateway/src/utils/circuitBreaker.js
class CircuitBreaker {
    constructor(options = {}) {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.lastFailureTime = null;
      this.failureThreshold = options.errorThreshold || 5;
      this.resetTimeout = options.resetTimeout || 30000;
      this.timeoutDuration = options.timeoutDuration || 5000;
    }
  
    async execute(action) {
      if (this.state === 'OPEN') {
        if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
          this.state = 'HALF-OPEN';
        } else {
          const error = new Error('Circuit breaker is OPEN');
          error.name = 'CircuitBreakerError';
          throw error;
        }
      }
  
      try {
        // Agregar timeout a la acción
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => {
            reject(new Error('Operation timed out'));
          }, this.timeoutDuration);
        });
  
        const result = await Promise.race([action(), timeoutPromise]);
        
        // En caso de éxito
        this.onSuccess();
        return result;
  
      } catch (error) {
        this.onFailure();
        throw error;
      }
    }
  
    onSuccess() {
      this.failureCount = 0;
      if (this.state === 'HALF-OPEN') {
        this.state = 'CLOSED';
      }
      this.successCount++;
    }
  
    onFailure() {
      this.failureCount++;
      this.lastFailureTime = Date.now();
      if (this.failureCount >= this.failureThreshold) {
        this.state = 'OPEN';
      }
    }
  
    getState() {
      return this.state;
    }
  
    getFailures() {
      return this.failureCount;
    }
  
    getLastFailure() {
      return this.lastFailureTime;
    }
  
    reset() {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.lastFailureTime = null;
    }
  }
  
  module.exports = CircuitBreaker;