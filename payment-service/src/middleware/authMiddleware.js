// payment-service/src/middleware/authMiddleware.js

const CircuitBreaker = require('../utils/circuitBreaker');
const logger = require('../sidecars/logging/logger');
const config = require('../config');

const authServiceBreaker = new CircuitBreaker({
  timeout: config.services.auth.timeout || 3000,
  errorThreshold: 3,
  resetTimeout: 30000
});

async function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      logger.warn('No token provided');
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const response = await authServiceBreaker.execute(async () => {
        return await fetch(`${config.services.auth.url}/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });
      });

      if (!response.ok) {
        throw new Error('Token validation failed');
      }

      const userData = await response.json();
      req.user = userData;
      
      logger.info(`User authenticated: ${userData.userId}`);
      next();
    } catch (error) {
      if (error.name === 'CircuitBreakerError') {
        logger.warn('Auth service is down, using fallback validation');
        // En un ambiente de producción, podrías implementar una validación local
        req.user = { id: 1, role: 'user' }; // Temporal para desarrollo
        return next();
      }
      throw error;
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Authentication failed' });
  }
}

module.exports = authMiddleware;