// api-gateway/src/middleware/auth.js
const config = require('../config');
const CircuitBreaker = require('../utils/circuitBreaker');
const logger = require('../utils/logger');

const authBreaker = new CircuitBreaker({
  timeoutDuration: config.services.auth.timeout,
  errorThreshold: 5,
  resetTimeout: 30000
});

async function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                 req.header('x-auth-token');

    if (!token) {
      logger.warn('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      // Validar token con el auth-service usando circuit breaker
      const userData = await authBreaker.execute(async () => {
        const response = await fetch(`${config.services.auth.url}/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error('Token validation failed');
        }

        return response.json();
      });

      // Agregar información del usuario al request
      req.user = userData;
      next();

    } catch (error) {
      if (error.name === 'CircuitBreakerError') {
        logger.error('Auth service is unavailable', { error: error.message });
        return res.status(503).json({ 
          message: 'Authentication service temporarily unavailable'
        });
      }

      logger.error('Token validation error', { error: error.message });
      return res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error', { error: error.message });
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = authMiddleware;