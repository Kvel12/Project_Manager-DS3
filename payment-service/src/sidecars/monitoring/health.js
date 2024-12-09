// payment-service/src/sidecars/monitoring/health.js
class HealthCheck {
    constructor() {
      this.services = {
        database: false,
        projectService: false,
        authService: false
      };
      this.lastCheck = null;
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
        // Verificar Project Service
        const projectResponse = await fetch('http://project-service:3002/health');
        this.services.projectService = projectResponse.ok;
      } catch (error) {
        this.services.projectService = false;
      }
  
      try {
        // Verificar Auth Service
        const authResponse = await fetch('http://auth-service:3001/health');
        this.services.authService = authResponse.ok;
      } catch (error) {
        this.services.authService = false;
      }
  
      this.lastCheck = new Date();
  
      return {
        status: this.isHealthy() ? 'healthy' : 'unhealthy',
        timestamp: this.lastCheck,
        services: this.services,
        uptime: process.uptime()
      };
    }
  
    isHealthy() {
      return Object.values(this.services).every(status => status);
    }
  }
  
  module.exports = new HealthCheck();