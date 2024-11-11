// project-service/src/sidecars/monitoring/health.js
class HealthCheck {
    constructor() {
      this.services = {
        database: false,
        paymentService: false
      };
    }
  
    async checkHealth() {
      try {
        // Verificar base de datos
        await require('../../models').sequelize.authenticate();
        this.services.database = true;
      } catch (error) {
        this.services.database = false;
      }
  
      try {
        // Verificar servicio de pagos
        const response = await fetch('http://payment-service:3003/health');
        this.services.paymentService = response.ok;
      } catch (error) {
        this.services.paymentService = false;
      }
  
      return {
        status: this.isHealthy() ? 'healthy' : 'unhealthy',
        timestamp: new Date(),
        services: this.services
      };
    }
  
    isHealthy() {
      return Object.values(this.services).every(status => status);
    }
  }
  
  module.exports = new HealthCheck();