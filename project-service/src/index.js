// project-service/src/index.js
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const config = require('./config');
const projectRoutes = require('./routes/projectRoutes');
const taskRoutes = require('./routes/taskRoutes');
const logger = require('./sidecars/logging/logger');
const monitor = require('./sidecars/monitoring/monitor');
const healthCheck = require('./sidecars/monitoring/health');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use('/projects', require('./routes/validationRoutes'));

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info('Request processed', {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
    monitor.recordResponseTime(req.path, duration);
  });
  next();
});

// Routes - Note: removed /projects prefix as it's handled by API Gateway
app.use('/', projectRoutes);
app.use('/tasks', taskRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthCheck.checkHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Metrics endpoint
app.get('/metrics', (req, res) => {
  res.json(monitor.getMetrics());
});

// Error handling middleware
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  
  if (err.name === 'SagaExecutionFailed') {
    return res.status(400).json({
      message: err.message,
      details: err.compensationResults
    });
  }

  if (err.name === 'CircuitBreakerError') {
    return res.status(503).json({
      message: 'Service temporarily unavailable',
      retry: true
    });
  }

  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Initialize database and start server
async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established');
    
    if (process.env.NODE_ENV === 'development') {
      await sequelize.sync({ alter: true });
      logger.info('Database synchronized');
    }

    app.listen(config.service.port, () => {
      logger.info(`Project service running on port ${config.service.port}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

startServer();

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

module.exports = app;