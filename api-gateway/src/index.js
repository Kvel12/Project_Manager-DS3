// api-gateway/src/index.js
const express = require('express');
const cors = require('cors');
const routes = require('./routes');
const logger = require('./utils/logger');

const app = express();

// Middleware básicos
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    logger.info('Request processed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration: Date.now() - start,
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
    timestamp: new Date(),
    uptime: process.uptime()
  });
});

// Error handler
app.use((err, req, res, next) => {
  logger.error('Error handling request:', err);
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Solo iniciar el servidor Express si no estamos usando Nginx
if (process.env.USE_EXPRESS_SERVER === 'true') {
  const PORT = process.env.PORT || 3000;
  app.listen(PORT, () => {
    logger.info(`API Gateway Express server running on port ${PORT}`);
  });
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', {
    promise,
    reason: reason.toString(),
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

module.exports = app;