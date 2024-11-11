// api-gateway/src/routes/index.js
const express = require('express');
const { authLimiter, serviceRateLimiter } = require('../middleware/rate-limit');
const authMiddleware = require('../middleware/auth');
const logger = require('../utils/logger');
const config = require('../config');
const CircuitBreaker = require('../utils/circuitBreaker');

const router = express.Router();

// Circuit Breakers para cada servicio
const serviceBreakers = {
  auth: new CircuitBreaker({
    timeoutDuration: config.services.auth.timeout,
    errorThreshold: 5,
    resetTimeout: 30000
  }),
  project: new CircuitBreaker({
    timeoutDuration: config.services.project.timeout,
    errorThreshold: 5,
    resetTimeout: 30000
  }),
  payment: new CircuitBreaker({
    timeoutDuration: config.services.payment.timeout,
    errorThreshold: 5,
    resetTimeout: 30000
  }),
  support: new CircuitBreaker({
    timeoutDuration: config.services.support.timeout,
    errorThreshold: 5,
    resetTimeout: 30000
  })
};

// Middleware para proxying con Circuit Breaker
const proxyWithBreaker = (serviceName) => async (req, res, next) => {
  const breaker = serviceBreakers[serviceName];
  const serviceConfig = config.services[serviceName];

  try {
    const response = await breaker.execute(async () => {
      const url = `${serviceConfig.url}${req.originalUrl}`;
      const response = await fetch(url, {
        method: req.method,
        headers: {
          ...req.headers,
          host: new URL(serviceConfig.url).host
        },
        body: ['POST', 'PUT', 'PATCH'].includes(req.method) ? 
          JSON.stringify(req.body) : undefined
      });

      if (!response.ok) {
        throw new Error(`Service responded with status ${response.status}`);
      }

      return response;
    });

    const data = await response.json();
    res.status(response.status).json(data);

  } catch (error) {
    if (error.name === 'CircuitBreakerError') {
      logger.error(`Service ${serviceName} circuit breaker opened`, {
        service: serviceName,
        error: error.message
      });
      res.status(503).json({
        message: `${serviceName} service temporarily unavailable`,
        retry: true
      });
    } else {
      next(error);
    }
  }
};

// Rutas de autenticación
router.use('/auth', 
  authLimiter,
  proxyWithBreaker('auth')
);

// Rutas de proyectos
router.use('/projects',
  authMiddleware,
  serviceRateLimiter('project'),
  proxyWithBreaker('project')
);

// Rutas de pagos
router.use('/payments',
  authMiddleware,
  serviceRateLimiter('payment'),
  proxyWithBreaker('payment')
);

// Rutas de soporte
router.use('/support',
  authMiddleware,
  serviceRateLimiter('support'),
  proxyWithBreaker('support')
);

// Health check para todos los servicios
router.get('/health', async (req, res) => {
  const healthStatus = {
    gateway: 'healthy',
    services: {}
  };

  for (const [service, breaker] of Object.entries(serviceBreakers)) {
    try {
      await breaker.execute(async () => {
        const response = await fetch(`${config.services[service].url}/health`);
        if (!response.ok) throw new Error('Service unhealthy');
        healthStatus.services[service] = 'healthy';
      });
    } catch (error) {
      healthStatus.services[service] = 'unhealthy';
    }
  }

  const httpStatus = Object.values(healthStatus.services).every(
    status => status === 'healthy'
  ) ? 200 : 503;

  res.status(httpStatus).json(healthStatus);
});

// Métricas y monitoreo
router.get('/metrics', authMiddleware, (req, res) => {
  const metrics = {
    circuitBreakers: {},
    timestamp: new Date()
  };

  // Recopilar estado de los circuit breakers
  for (const [service, breaker] of Object.entries(serviceBreakers)) {
    metrics.circuitBreakers[service] = {
      state: breaker.getState(),
      failures: breaker.getFailures(),
      lastFailure: breaker.getLastFailure()
    };
  }

  res.json(metrics);
});

module.exports = router;