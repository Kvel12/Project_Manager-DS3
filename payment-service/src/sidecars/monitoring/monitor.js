// payment-service/src/sidecars/monitoring/monitor.js
const logger = require('../logging/logger');

class MonitorService {
  constructor() {
    this.metrics = {
      operations: {
        payments: { success: 0, failure: 0 },
        refunds: { success: 0, failure: 0 }
      },
      sagas: {
        started: 0,
        completed: 0,
        failed: 0,
        active: new Set(),
        history: []
      },
      events: [],
      responseTimes: {},
      statusCodes: {},
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

  recordResponseTime(path, duration) {
    if (!this.metrics.responseTimes[path]) {
      this.metrics.responseTimes[path] = [];
    }
    this.metrics.responseTimes[path].push(duration);
    this.updateMetrics();
  }

  recordStatusCode(path, code) {
    if (!this.metrics.statusCodes[path]) {
      this.metrics.statusCodes[path] = {};
    }
    if (!this.metrics.statusCodes[path][code]) {
      this.metrics.statusCodes[path][code] = 0;
    }
    this.metrics.statusCodes[path][code]++;
    this.updateMetrics();
  }

  recordSagaStart(sagaId) {
    this.metrics.sagas.started++;
    this.metrics.sagas.active.add(sagaId);
    logger.info(`Saga started: ${sagaId}`);
    this.updateMetrics();
  }

  recordSagaSuccess(sagaId) {
    this.metrics.sagas.completed++;
    this.metrics.sagas.active.delete(sagaId);
    logger.info(`Saga completed: ${sagaId}`);
    this.updateMetrics();
  }

  recordSagaFailure(sagaId) {
    this.metrics.sagas.failed++;
    this.metrics.sagas.active.delete(sagaId);
    logger.error(`Saga failed: ${sagaId}`);
    this.updateMetrics();
  }

  recordSuccessfulOperation(operation) {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = { success: 0, failure: 0 };
    }
    this.metrics.operations[operation].success++;
    this.updateMetrics();
  }

  recordFailedOperation(operation) {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = { success: 0, failure: 0 };
    }
    this.metrics.operations[operation].failure++;
    this.updateMetrics();
  }

  updateMetrics() {
    this.metrics.lastUpdated = new Date();
  }

  getMetrics() {
    return {
      ...this.metrics,
      activeSagas: Array.from(this.metrics.sagas.active),
      averageResponseTimes: this.calculateAverageResponseTimes(),
      events: this.metrics.events.slice(-100)
    };
  }

  calculateAverageResponseTimes() {
    const averages = {};
    Object.entries(this.metrics.responseTimes).forEach(([path, times]) => {
      if (times.length > 0) {
        averages[path] = times.reduce((a, b) => a + b) / times.length;
      }
    });
    return averages;
  }

  cleanOldMetrics() {
    Object.keys(this.metrics.responseTimes).forEach(path => {
      this.metrics.responseTimes[path] = this.metrics.responseTimes[path].slice(-100);
    });
    this.metrics.events = this.metrics.events.slice(-1000);
  }
}

module.exports = new MonitorService();