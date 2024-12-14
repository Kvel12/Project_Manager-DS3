require('dotenv').config();

// Configuración global para los tests
global.API_GATEWAY_URL = process.env.API_GATEWAY_URL || 'http://api-gateway';
global.AUTH_SERVICE_URL = process.env.AUTH_SERVICE_URL || 'http://auth-service:3001';
global.PROJECT_SERVICE_URL = process.env.PROJECT_SERVICE_URL || 'http://project-service:3002';
global.PAYMENT_SERVICE_URL = process.env.PAYMENT_SERVICE_URL || 'http://payment-service:3003';