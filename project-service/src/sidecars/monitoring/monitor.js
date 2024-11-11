// project-service/src/sidecars/monitoring/monitor.js
class MonitorService {
    constructor() {
      this.metrics = {
        sagas: {
          started: 0,
          completed: 0,
          failed: 0
        },
        operations: {
          success: {},
          failed: {},
          responseTimes: {}
        },
        circuitBreakers: {
          paymentService: 'CLOSED',
          authService: 'CLOSED'
        },
        lastUpdated: new Date()
      };
  
      // Limpiar métricas viejas cada hora
      setInterval(() => this.cleanOldMetrics(), 3600000);
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
  
    recordSuccessfulOperation(operation) {
      if (!this.metrics.operations.success[operation]) {
        this.metrics.operations.success[operation] = 0;
      }
      this.metrics.operations.success[operation]++;
      this.updateMetrics();
    }
  
    recordFailedOperation(operation) {
      if (!this.metrics.operations.failed[operation]) {
        this.metrics.operations.failed[operation] = 0;
      }
      this.metrics.operations.failed[operation]++;
      this.updateMetrics();
    }
  
    recordResponseTime(operation, time) {
      if (!this.metrics.operations.responseTimes[operation]) {
        this.metrics.operations.responseTimes[operation] = [];
      }
      this.metrics.operations.responseTimes[operation].push(time);
      this.updateMetrics();
    }
  
    updateCircuitBreakerStatus(service, status) {
      this.metrics.circuitBreakers[service] = status;
      this.updateMetrics();
    }
  
    getMetrics() {
      return {
        ...this.metrics,
        operationAverages: this.calculateAverages()
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
        // Mantener solo los últimos 100 tiempos de respuesta
        this.metrics.operations.responseTimes[operation] = 
          this.metrics.operations.responseTimes[operation].slice(-100);
      });
    }
  
    updateMetrics() {
      this.metrics.lastUpdated = new Date();
    }
  }
  
  module.exports = new MonitorService();