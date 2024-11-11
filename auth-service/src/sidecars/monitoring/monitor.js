// auth-service/src/sidecars/monitoring/monitor.js
class MonitorService {
    constructor() {
      this.metrics = {
        requests: {
          login: { success: 0, failure: 0 },
          register: { success: 0, failure: 0 }
        },
        responseTimes: {
          login: [],
          register: []
        },
        errors: [],
        lastCheck: Date.now()
      };
  
      // Limpiar métricas antiguas cada hora
      setInterval(() => this.cleanOldMetrics(), 3600000);
    }
  
    recordEvent(type, result) {
      if (!this.metrics.requests[type]) {
        this.metrics.requests[type] = { success: 0, failure: 0 };
      }
      this.metrics.requests[type][result === 'success' ? 'success' : 'failure']++;
    }
  
    recordResponseTime(type, time) {
      if (!this.metrics.responseTimes[type]) {
        this.metrics.responseTimes[type] = [];
      }
      this.metrics.responseTimes[type].push(time);
    }
  
    recordError(error) {
      this.metrics.errors.push({
        timestamp: Date.now(),
        message: error.message
      });
    }
  
    getMetrics() {
      return {
        uptime: process.uptime(),
        requests: this.metrics.requests,
        averageResponseTimes: this.calculateAverageResponseTimes(),
        errorRate: this.calculateErrorRate(),
        lastCheck: this.metrics.lastCheck
      };
    }
  
    calculateAverageResponseTimes() {
      const averages = {};
      for (const [type, times] of Object.entries(this.metrics.responseTimes)) {
        if (times.length > 0) {
          averages[type] = times.reduce((a, b) => a + b) / times.length;
        }
      }
      return averages;
    }
  
    calculateErrorRate() {
      const total = Object.values(this.metrics.requests)
        .reduce((acc, curr) => acc + curr.success + curr.failure, 0);
      const failures = Object.values(this.metrics.requests)
        .reduce((acc, curr) => acc + curr.failure, 0);
      return total === 0 ? 0 : (failures / total) * 100;
    }
  
    cleanOldMetrics() {
      for (const type in this.metrics.responseTimes) {
        this.metrics.responseTimes[type] = 
          this.metrics.responseTimes[type].slice(-100); // Mantener últimas 100 mediciones
      }
      this.metrics.errors = 
        this.metrics.errors.filter(e => 
          Date.now() - e.timestamp < 3600000); // Mantener errores de última hora
      this.metrics.lastCheck = Date.now();
    }
  }
  
  module.exports = new MonitorService();