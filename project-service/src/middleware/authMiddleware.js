// project-service/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const CircuitBreaker = require('../utils/circuitBreaker');
const logger = require('../sidecars/logging/logger');
const config = require('../config');

const authServiceBreaker = new CircuitBreaker({
  name: 'auth-service',
  timeout: config.services.auth.timeout || 5000,
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
      // Intenta validar con auth-service primero
      const validationResult = await authServiceBreaker.execute(async () => {
        const response = await fetch(`${config.services.auth.url}/validate`, {
          method: 'GET',
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          const error = await response.json();
          logger.error('Token validation failed:', error);
          throw new Error(error.message || 'Token validation failed');
        }

        return response.json();
      });

      // Si la validación es exitosa
      req.user = {
        id: validationResult.userId,
        role: validationResult.role
      };

      logger.info(`User authenticated: ${req.user.id}`);
      next();

    } catch (error) {
      if (error.name === 'CircuitBreakerError') {
        logger.warn('Auth service is down, falling back to local validation');
        
        // Fallback: validación local del token
        try {
          const decoded = jwt.verify(token, config.jwt.secret);
          req.user = {
            id: decoded.userId,
            role: decoded.role
          };
          next();
        } catch (jwtError) {
          logger.error('Local token validation failed:', jwtError);
          res.status(401).json({ message: 'Invalid token' });
        }
      } else {
        throw error;
      }
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Invalid token' });
  }
}

module.exports = authMiddleware;