// api-gateway/src/index.js
const express = require('express');
const cors = require('./middleware/cors');
const { checkRedisHealth } = require('./middleware/rate-limit');
const routes = require('./routes');
const { globalErrorHandler, notFoundHandler } = require('./errors/handlers');
const logger = require('./utils/logger');
const config = require('./config');

const app = express();

// Middleware básicos
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cors);

// Health check de Redis para rate limiting
app.use(checkRedisHealth);

// Logging de requests
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration,
      ip: req.ip
    });
  });
  next();
});

// Rutas
app.use('/api', routes);

// Health check
app.get('/health', (req, res) => {
  res.json({
    status: 'healthy',
    uptime: process.uptime(),
    timestamp: new Date()
  });
});

// Manejo de rutas no encontradas
app.use(notFoundHandler);

// Manejo de errores global
app.use(globalErrorHandler);

// Manejo de errores de proceso
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason,
    stack: reason.stack
  });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', {
    error: error.message,
    stack: error.stack
  });
  // Dar tiempo para logging antes de terminar
  setTimeout(() => process.exit(1), 1000);
});

const PORT = config.server.port;
app.listen(PORT, () => {
  logger.info(`API Gateway running on port ${PORT}`);
});