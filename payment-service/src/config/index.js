// payment-service/src/config/index.js
require('dotenv').config();

module.exports = {
  service: {
    name: 'payment-service',
    port: process.env.PORT || 3003,
    environment: process.env.NODE_ENV || 'development'
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'payment_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres',
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  },
  services: {
    project: {
      url: process.env.PROJECT_SERVICE_URL || 'http://project-service:3002',
      timeout: parseInt(process.env.PROJECT_SERVICE_TIMEOUT) || 5000
    },
    auth: {
      url: process.env.AUTH_SERVICE_URL || 'http://auth-service:3001',
      timeout: parseInt(process.env.AUTH_SERVICE_TIMEOUT) || 5000
    }
  },
  saga: {
    timeout: parseInt(process.env.SAGA_TIMEOUT) || 10000,
    retries: parseInt(process.env.SAGA_RETRIES) || 3
  }
};