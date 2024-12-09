// project-service/src/sidecars/monitoring/monitor.js
const logger = require('../logging/logger');

class MonitorService {
  constructor() {
    this.metrics = {
      sagas: {
        started: 0,
        completed: 0,
        failed: 0,
        active: new Set(),
        history: []
      },
      operations: {
        success: {},
        failed: {},
        responseTimes: {},
        statusCodes: {}
      },
      events: [],
      circuitBreakers: {
        paymentService: 'CLOSED',
        authService: 'CLOSED'
      },
      lastUpdated: new Date()
    };
  }

  recordEvent(eventType, metadata = {}) {
    const event = {
      type: eventType,
      timestamp: new Date(),
      ...metadata
    };
    this.metrics.events.push(event);
    logger.debug(`Event recorded: ${eventType}`, metadata);
  }

  recordSagaStart(sagaId) {
    this.metrics.sagas.started++;
    this.metrics.sagas.active.add(sagaId);
    this.recordEvent('saga_started', { sagaId });
    logger.info(`Saga started: ${sagaId}`);
  }

  recordSagaSuccess(sagaId) {
    this.metrics.sagas.completed++;
    this.metrics.sagas.active.delete(sagaId);
    this.recordEvent('saga_completed', { sagaId });
    logger.info(`Saga completed: ${sagaId}`);
  }

  recordSagaFailure(sagaId, error) {
    this.metrics.sagas.failed++;
    this.metrics.sagas.active.delete(sagaId);
    this.recordEvent('saga_failed', { sagaId, error: error.message });
    logger.error(`Saga failed: ${sagaId}`);
  }

  recordSuccessfulOperation(operation) {
    if (!this.metrics.operations.success[operation]) {
      this.metrics.operations.success[operation] = 0;
    }
    this.metrics.operations.success[operation]++;
    this.recordEvent('operation_success', { operation });
  }

  recordFailedOperation(operation, error) {
    if (!this.metrics.operations.failed[operation]) {
      this.metrics.operations.failed[operation] = 0;
    }
    this.metrics.operations.failed[operation]++;
    this.recordEvent('operation_failed', { operation, error: error.message });
  }

  recordResponseTime(operation, time) {
    if (!this.metrics.operations.responseTimes[operation]) {
      this.metrics.operations.responseTimes[operation] = [];
    }
    this.metrics.operations.responseTimes[operation].push(time);
  }

  recordStatusCode(operation, code) {
    if (!this.metrics.operations.statusCodes[operation]) {
      this.metrics.operations.statusCodes[operation] = {};
    }
    if (!this.metrics.operations.statusCodes[operation][code]) {
      this.metrics.operations.statusCodes[operation][code] = 0;
    }
    this.metrics.operations.statusCodes[operation][code]++;
  }

  updateCircuitBreakerStatus(service, status) {
    this.metrics.circuitBreakers[service] = status;
    this.recordEvent('circuit_breaker_status_change', { service, status });
  }

  getMetrics() {
    return {
      ...this.metrics,
      events: this.metrics.events.slice(-100),
      responseTimes: this.calculateAverages()
    };
  }

  calculateAverages() {
    const averages = {};
    Object.entries(this.metrics.operations.responseTimes).forEach(([op, times]) => {
      if (times.length > 0) {
        averages[op] = times.reduce((a, b) => a + b) / times.length;
      }
    });
    return averages;
  }

  cleanOldMetrics() {
    Object.keys(this.metrics.operations.responseTimes).forEach(operation => {
      this.metrics.operations.responseTimes[operation] = 
        this.metrics.operations.responseTimes[operation].slice(-100);
    });
    this.metrics.events = this.metrics.events.slice(-1000);
  }
}

module.exports = new MonitorService();