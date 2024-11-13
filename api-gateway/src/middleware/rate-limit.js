// api-gateway/src/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');
const Redis = require('ioredis');
const logger = require('../utils/logger');

// Memory store fallback
const MemoryStore = new Map();

// Configuración de rate limiting
const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5 // 5 intentos
  },
  general: {
    windowMs: 15 * 60 * 1000,
    max: 100 // 100 solicitudes
  }
};

// Rate limiter básico sin Redis
const createLimiter = (config) => {
  return rateLimit({
    windowMs: config.windowMs,
    max: config.max,
    standardHeaders: true,
    legacyHeaders: false,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${req.ip}`);
      res.status(429).json({
        message: 'Too many requests, please try again later'
      });
    }
  });
};

// Auth routes limiter
const authLimiter = createLimiter(rateLimitConfig.auth);

// General routes limiter
const generalLimiter = createLimiter(rateLimitConfig.general);

// Service specific limiter
const serviceRateLimiter = (service) => {
  return createLimiter({
    windowMs: 15 * 60 * 1000,
    max: 50
  });
};

module.exports = {
  authLimiter,
  generalLimiter,
  serviceRateLimiter
};