// api-gateway/src/middleware/rate-limit.js
const rateLimit = require('express-rate-limit');
const RedisStore = require('rate-limit-redis');
const Redis = require('ioredis');
const config = require('../config');
const logger = require('../utils/logger');

// Configuración de Redis
const redis = new Redis({
  host: process.env.REDIS_HOST || 'localhost',
  port: process.env.REDIS_PORT || 6379,
  enableOfflineQueue: false
});

redis.on('error', (error) => {
  logger.error('Redis error:', error);
});

// Configuraciones de rate limiting
const rateLimitConfig = {
  auth: {
    windowMs: 15 * 60 * 1000, // 15 minutos
    max: 5, // 5 intentos
    message: 'Too many authentication attempts, please try again later'
  },
  general: {
    windowMs: 15 * 60 * 1000,
    max: 100, // 100 solicitudes
    message: 'Too many requests from this IP, please try again later'
  }
};

// Rate limiter para rutas de autenticación
const authLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:auth:'
  }),
  ...rateLimitConfig.auth,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for auth endpoint', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      message: rateLimitConfig.auth.message
    });
  }
});

// Rate limiter para rutas generales
const generalLimiter = rateLimit({
  store: new RedisStore({
    client: redis,
    prefix: 'rl:general:'
  }),
  ...rateLimitConfig.general,
  handler: (req, res) => {
    logger.warn('Rate limit exceeded for general endpoint', {
      ip: req.ip,
      path: req.path
    });
    res.status(429).json({
      message: rateLimitConfig.general.message
    });
  }
});

// Rate limiter por servicio
function serviceRateLimiter(service) {
  return rateLimit({
    store: new RedisStore({
      client: redis,
      prefix: `rl:${service}:`
    }),
    windowMs: 15 * 60 * 1000,
    max: 50, // 50 solicitudes por ventana
    message: `Too many requests for ${service} service`,
    handler: (req, res) => {
      logger.warn(`Rate limit exceeded for ${service} service`, {
        ip: req.ip,
        path: req.path
      });
      res.status(429).json({
        message: `Too many requests for ${service} service, please try again later`
      });
    }
  });
}

// Middleware para verificar el estado de Redis
function checkRedisHealth(req, res, next) {
  if (!redis.status === 'ready') {
    logger.error('Redis is not available');
    // Fallback a límites en memoria si Redis no está disponible
    return rateLimit({
      windowMs: 15 * 60 * 1000,
      max: 30,
      message: 'Rate limiting service degraded, please try again later'
    })(req, res, next);
  }
  next();
}

module.exports = {
  authLimiter,
  generalLimiter,
  serviceRateLimiter,
  checkRedisHealth
};