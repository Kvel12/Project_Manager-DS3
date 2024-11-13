// payment-service/src/utils/circuitBreaker.js
class CircuitBreaker {
    constructor(options = {}) {
      this.state = 'CLOSED';
      this.failureCount = 0;
      this.successCount = 0;
      this.lastFailureTime = null;
      this.timeout = options.timeout || 3000;
      this.failureThreshold = options.errorThreshold || 5;
      this.resetTimeout = options.resetTimeout || 30000;
    }
  
    async execute(action) {
      if (this.state === 'OPEN') {
        if (Date.now() - this.lastFailureTime >= this.resetTimeout) {
          this.state = 'HALF-OPEN';
        } else {
          throw new Error('Circuit breaker is OPEN');
        }
      }
  
      try {
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Operation timed out')), this.timeout);
        });
  
        const result = await Promise.race([action(), timeoutPromise]);
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
  }
  
  module.exports = CircuitBreaker;