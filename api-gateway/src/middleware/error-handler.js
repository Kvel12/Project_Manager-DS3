// api-gateway/src/middleware/error-handler.js
const logger = require('../utils/logger');

function errorHandler(err, req, res, next) {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method
  });

  // Si es un error de CircuitBreaker
  if (err.name === 'CircuitBreakerError') {
    return res.status(503).json({
      message: 'Service temporarily unavailable',
      retry: true
    });
  }

  // Error genérico
  res.status(500).json({
    message: process.env.NODE_ENV === 'production' 
      ? 'Internal server error' 
      : err.message
  });
}

module.exports = errorHandler;