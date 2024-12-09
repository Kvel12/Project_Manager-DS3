// api-gateway/src/errors/handlers.js
const logger = require('../utils/logger');

class ErrorHandler {
  static handleServiceError(serviceName, error, res) {
    logger.error(`${serviceName} service error:`, {
      service: serviceName,
      error: error.message,
      stack: error.stack
    });

    // Circuit Breaker Error
    if (error.name === 'CircuitBreakerError') {
      return res.status(503).json({
        status: 'error',
        message: `${serviceName} service is temporarily unavailable`,
        code: 'SERVICE_UNAVAILABLE',
        retry: true
      });
    }

    // Timeout Error
    if (error.name === 'TimeoutError') {
      return res.status(504).json({
        status: 'error',
        message: `${serviceName} service timeout`,
        code: 'SERVICE_TIMEOUT',
        retry: true
      });
    }

    // Service Not Found
    if (error.response?.status === 404) {
      return res.status(404).json({
        status: 'error',
        message: 'Resource not found',
        code: 'NOT_FOUND'
      });
    }

    // Service Authentication Error
    if (error.response?.status === 401) {
      return res.status(401).json({
        status: 'error',
        message: 'Authentication failed',
        code: 'UNAUTHORIZED'
      });
    }

    // Default Error
    return res.status(500).json({
      status: 'error',
      message: 'Internal server error',
      code: 'INTERNAL_ERROR'
    });
  }

  static handleValidationError(error, res) {
    logger.warn('Validation error:', {
      error: error.message,
      details: error.details
    });

    return res.status(400).json({
      status: 'error',
      message: 'Validation failed',
      code: 'VALIDATION_ERROR',
      details: error.details
    });
  }

  static handleAuthenticationError(error, res) {
    logger.warn('Authentication error:', {
      error: error.message
    });

    return res.status(401).json({
      status: 'error',
      message: 'Authentication failed',
      code: 'AUTH_ERROR'
    });
  }

  static handleRateLimitError(error, res) {
    logger.warn('Rate limit exceeded:', {
      error: error.message
    });

    return res.status(429).json({
      status: 'error',
      message: 'Too many requests',
      code: 'RATE_LIMIT_EXCEEDED',
      retry: true
    });
  }
}

// Middleware de manejo de errores global
const globalErrorHandler = (err, req, res, next) => {
  logger.error('Unhandled error:', {
    error: err.message,
    stack: err.stack,
    path: req.path,
    method: req.method,
    body: req.body
  });

  if (process.env.NODE_ENV === 'development') {
    return res.status(500).json({
      status: 'error',
      message: err.message,
      stack: err.stack,
      code: 'INTERNAL_ERROR'
    });
  }

  return res.status(500).json({
    status: 'error',
    message: 'Internal server error',
    code: 'INTERNAL_ERROR'
  });
};

// Middleware para errores 404
const notFoundHandler = (req, res) => {
  logger.warn('Route not found:', {
    path: req.path,
    method: req.method
  });

  res.status(404).json({
    status: 'error',
    message: 'Route not found',
    code: 'NOT_FOUND'
  });
};

// api-gateway/src/errors/types.js
class ServiceError extends Error {
  constructor(message, serviceName, statusCode = 500) {
    super(message);
    this.name = 'ServiceError';
    this.serviceName = serviceName;
    this.statusCode = statusCode;
  }
}

class ValidationError extends Error {
  constructor(message, details) {
    super(message);
    this.name = 'ValidationError';
    this.details = details;
  }
}

class AuthenticationError extends Error {
  constructor(message) {
    super(message);
    this.name = 'AuthenticationError';
  }
}

class RateLimitError extends Error {
  constructor(message) {
    super(message);
    this.name = 'RateLimitError';
  }
}

module.exports = {
  ErrorHandler,
  globalErrorHandler,
  notFoundHandler,
  ServiceError,
  ValidationError,
  AuthenticationError,
  RateLimitError
};