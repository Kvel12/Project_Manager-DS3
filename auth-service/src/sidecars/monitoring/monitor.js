// auth-service/src/sidecars/monitoring/monitor.js
class MonitorService {
  constructor() {
    this.metrics = {
      operations: {
        register: { success: 0, failure: 0 },
        login: { success: 0, failure: 0 },
        validate: { success: 0, failure: 0 }
      },
      sagas: {
        started: 0,
        completed: 0,
        failed: 0,
        compensation: 0
      },
      responseTimes: {},
      activeUsers: new Set(),
      errors: [],
      lastUpdated: new Date()
    };

    // Limpiar métricas antiguas cada hora
    setInterval(() => this.cleanOldMetrics(), 3600000);
  }

  recordSuccessfulOperation(operation) {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = { success: 0, failure: 0 };
    }
    this.metrics.operations[operation].success++;
    this.updateMetrics();
  }

  recordFailedOperation(operation, reason) {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = { success: 0, failure: 0 };
    }
    this.metrics.operations[operation].failure++;
    this.recordError(operation, reason);
    this.updateMetrics();
  }

  recordResponseTime(operation, time) {
    if (!this.metrics.responseTimes[operation]) {
      this.metrics.responseTimes[operation] = [];
    }
    this.metrics.responseTimes[operation].push({
      time,
      timestamp: new Date()
    });
    this.updateMetrics();
  }

  recordStatusCode(operation, statusCode) {
    if (!this.metrics.operations[operation]) {
      this.metrics.operations[operation] = { success: 0, failure: 0 };
    }
    if (statusCode >= 400) {
      this.metrics.operations[operation].failure++;
    } else {
      this.metrics.operations[operation].success++;
    }
    this.updateMetrics();
  }

  recordError(operation, error) {
    this.metrics.errors.push({
      operation,
      error,
      timestamp: new Date()
    });
    // Mantener solo los últimos 100 errores
    if (this.metrics.errors.length > 100) {
      this.metrics.errors.shift();
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

  recordRequest(method, path, statusCode, duration) {
    const key = `${method}:${path}`;
    if (!this.metrics.operations[key]) {
      this.metrics.operations[key] = { success: 0, failure: 0 };
    }
    
    if (statusCode < 400) {
      this.metrics.operations[key].success++;
    } else {
      this.metrics.operations[key].failure++;
    }
    
    this.recordResponseTime(key, duration);
  }

  getMetrics() {
    return {
      ...this.metrics,
      averageResponseTimes: this.calculateAverageResponseTimes(),
      errorRate: this.calculateErrorRate(),
      activeUserCount: this.metrics.activeUsers.size
    };
  }

  calculateAverageResponseTimes() {
    const averages = {};
    for (const [operation, times] of Object.entries(this.metrics.responseTimes)) {
      if (times.length > 0) {
        const sum = times.reduce((acc, curr) => acc + curr.time, 0);
        averages[operation] = sum / times.length;
      }
    }
    return averages;
  }

  calculateErrorRate() {
    let totalOperations = 0;
    let totalErrors = 0;

    Object.values(this.metrics.operations).forEach(op => {
      totalOperations += op.success + op.failure;
      totalErrors += op.failure;
    });

    return totalOperations === 0 ? 0 : (totalErrors / totalOperations) * 100;
  }

  cleanOldMetrics() {
    const oneHourAgo = new Date(Date.now() - 3600000);
    
    // Limpiar tiempos de respuesta antiguos
    Object.keys(this.metrics.responseTimes).forEach(operation => {
      this.metrics.responseTimes[operation] = this.metrics.responseTimes[operation]
        .filter(item => item.timestamp > oneHourAgo);
    });

    // Limpiar errores antiguos
    this.metrics.errors = this.metrics.errors
      .filter(error => error.timestamp > oneHourAgo);

    this.updateMetrics();
  }

  updateMetrics() {
    this.metrics.lastUpdated = new Date();
  }
}

module.exports = new MonitorService();