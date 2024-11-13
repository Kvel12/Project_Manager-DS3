// payment-service/src/sidecars/monitoring/monitor.js
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
        failed: 0
      },
      responseTimes: {},
      lastUpdated: new Date()
    };
  }

  recordResponseTime(path, duration) {
    if (!this.metrics.responseTimes[path]) {
      this.metrics.responseTimes[path] = [];
    }
    this.metrics.responseTimes[path].push(duration);
    this.updateMetrics();
  }

  recordSagaStart(sagaId) {
    this.metrics.sagas.started++;
    this.updateMetrics();
  }

  recordSagaSuccess(sagaId) {
    this.metrics.sagas.completed++;
    this.updateMetrics();
  }

  recordSagaFailure(sagaId) {
    this.metrics.sagas.failed++;
    this.updateMetrics();
  }

  updateMetrics() {
    this.metrics.lastUpdated = new Date();
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTimes: this.calculateAverageResponseTimes()
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

  // Método para limpiar métricas antiguas
  cleanOldMetrics() {
    Object.keys(this.metrics.responseTimes).forEach(path => {
      this.metrics.responseTimes[path] = 
        this.metrics.responseTimes[path].slice(-100);
    });
  }
}

module.exports = new MonitorService();