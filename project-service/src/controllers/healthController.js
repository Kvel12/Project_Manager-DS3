// project-service/src/controllers/healthController.js
const { sequelize } = require('../models');
const logger = require('../sidecars/logging/logger');

async function healthCheck(req, res) {
  try {
    await sequelize.authenticate();
    res.json({
      status: 'healthy',
      database: 'connected',
      timestamp: new Date(),
      uptime: process.uptime()
    });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({
      status: 'unhealthy',
      database: 'disconnected',
      error: error.message,
      timestamp: new Date()
    });
  }
}

module.exports = { healthCheck };