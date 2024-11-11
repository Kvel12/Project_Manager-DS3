// payment-service/src/sidecars/monitoring/monitor.js
class MonitorService {
    constructor() {
      this.metrics = {
        payments: {
          total: 0,
          successful: 0,
          failed: 0,
          pending: 0,
          refunded: 0
        },
        sagas: {
          started: 0,
          completed: 0,
          failed: 0,
          compensations: 0
        },
        performance: {
          responseTimes: {},
          averageResponseTime: 0
        },
        errors: [],
        circuitBreakers: {
          projectService: 'CLOSED',
          authService: 'CLOSED'
        },
        lastUpdated: new Date()
      };
  
      // Limpiar métricas viejas cada hora
      setInterval(() => this.cleanOldMetrics(), 3600000);
    }
  
    recordPaymentAttempt(success = true) {
      this.metrics.payments.total++;
      if (success) {
        this.metrics.payments.successful++;
      } else {
        this.metrics.payments.failed++;
      }
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
  
    recordCompensation() {
      this.metrics.sagas.compensations++;
      this.updateMetrics();
    }
  
    recordResponseTime(operation, time) {
      if (!this.metrics.performance.responseTimes[operation]) {
        this.metrics.performance.responseTimes[operation] = [];
      }
      this.metrics.performance.responseTimes[operation].push(time);
      this.updateAverageResponseTime();
      this.updateMetrics();
    }
  
    recordError(error) {
      this.metrics.errors.push({
        timestamp: new Date(),
        message: error.message,
        stack: error.stack
      });
      // Mantener solo los últimos 100 errores
      if (this.metrics.errors.length > 100) {
        this.metrics.errors.shift();
      }
      this.updateMetrics();
    }
  
    updateCircuitBreakerStatus(service, status) {
      this.metrics.circuitBreakers[service] = status;
      this.updateMetrics();
    }
  
    getMetrics() {
      return {
        ...this.metrics,
        performance: {
          ...this.metrics.performance,
          averageResponseTime: this.calculateAverageResponseTime()
        }
      };
    }
  
    calculateAverageResponseTime() {
      let total = 0;
      let count = 0;
      
      Object.values(this.metrics.performance.responseTimes).forEach(times => {
        times.forEach(time => {
          total += time;
          count++;
        });
      });
  
      return count > 0 ? total / count : 0;
    }
  
    cleanOldMetrics() {
      // Limpiar tiempos de respuesta antiguos
      Object.keys(this.metrics.performance.responseTimes).forEach(operation => {
        // Mantener solo los últimos 100 tiempos por operación
        this.metrics.performance.responseTimes[operation] = 
          this.metrics.performance.responseTimes[operation].slice(-100);
      });
  
      // Limpiar errores antiguos (mantener últimas 24 horas)
      const oneDayAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      this.metrics.errors = this.metrics.errors.filter(error => 
        error.timestamp > oneDayAgo
      );
  
      this.updateMetrics();
    }
  
    updateMetrics() {
      this.metrics.lastUpdated = new Date();
    }
  }
  
  module.exports = new MonitorService();