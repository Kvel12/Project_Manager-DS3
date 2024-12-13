// auth-service/src/middleware/authMiddleware.js
const jwt = require('jsonwebtoken');
const { User } = require('../models');
const logger = require('../sidecars/logging/logger');

async function authMiddleware(req, res, next) {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '') || 
                 req.header('x-auth-token');

    if (!token) {
      return res.status(401).json({ message: 'No token provided' });
    }

    try {
      const decoded = jwt.verify(token, process.env.JWT_SECRET);
      const user = await User.findByPk(decoded.userId);

      if (!user || user.status !== 'active') {
        throw new Error('Invalid token');
      }

      req.user = {
        userId: decoded.userId,
        role: user.role
      };
      next();
    } catch (error) {
      logger.error('Token validation error:', error);
      res.status(401).json({ message: 'Invalid token' });
    }
  } catch (error) {
    logger.error('Auth middleware error:', error);
    res.status(500).json({ message: 'Internal server error' });
  }
}

module.exports = authMiddleware;