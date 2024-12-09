// api-gateway/src/config/index.js
require('dotenv').config();

module.exports = {
  server: {
    port: process.env.PORT || 80,
    environment: process.env.NODE_ENV || 'development'
  },
  services: {
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 5000
    },
    project: {
      url: process.env.PROJECT_SERVICE_URL || 'http://project-service:3002',
      timeout: parseInt(process.env.PROJECT_SERVICE_TIMEOUT) || 5000
    },
    payment: {
      url: process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003',
      timeout: parseInt(process.env.PAYMENT_SERVICE_TIMEOUT) || 5000
    },
    support: {
      url: process.env.SUPPORT_SERVICE_URL || 'http://support-service:3004',
      timeout: parseInt(process.env.SUPPORT_SERVICE_TIMEOUT) || 5000
    }
  },
  rateLimit: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 100 // límite por IP
  }
};