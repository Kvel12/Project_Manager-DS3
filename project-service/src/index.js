// project-service/src/index.js
const express = require('express');
const cors = require('cors');
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

// Routes
app.use('/projects', projectRoutes);
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
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Start server
app.listen(config.service.port, () => {
  logger.info(`Project service running on port ${config.service.port}`);
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  // Dar tiempo a que los logs se escriban antes de terminar
  setTimeout(() => process.exit(1), 1000);
});