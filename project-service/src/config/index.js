// project-service/src/config/index.js
require('dotenv').config();

module.exports = {
  service: {
    name: 'project-service',
    port: process.env.PORT || 3002,
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'project_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres'
  },
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 5000
    },
    payment: {
      url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003',
      timeout: parseInt(process.env.PAYMENT_SERVICE_TIMEOUT) || 5000
    }
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key'
  },
  circuitBreaker: {
    timeout: parseInt(process.env.CIRCUIT_BREAKER_TIMEOUT) || 3000,
    errorThreshold: parseInt(process.env.CIRCUIT_BREAKER_ERROR_THRESHOLD) || 5,
    resetTimeout: parseInt(process.env.CIRCUIT_BREAKER_RESET_TIMEOUT) || 30000
  }
};