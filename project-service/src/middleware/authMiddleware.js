// project-service/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const CircuitBreaker = require('../utils/circuitBreaker');
const logger = require('../sidecars/logging/logger');

const authServiceBreaker = new CircuitBreaker({
  timeout: 3000,
  errorThreshold: 3,
  resetTimeout: 30000
});

async function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      // Verificar token con auth-service usando circuit breaker
      const userData = await authServiceBreaker.execute(async () => {
        const response = await fetch('http://auth-service:3001/auth/validate', {
          headers: { 'Authorization': `Bearer ${token}` }
        });
        
        if (!response.ok) {
          throw new Error('Invalid token');
        }
        
        return response.json();
      });

      req.user = userData;
      next();
    } catch (error) {
      if (error.name === 'CircuitBreakerError') {
        // Si el circuit breaker está abierto, intentar validación local
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
        req.user = { id: decoded.userId };
        next();
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

