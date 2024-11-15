// payment-service/src/index.js
const express = require('express');
const cors = require('cors');
const { sequelize, syncModels } = require('./models');
const config = require('./config');
const paymentRoutes = require('./routes/paymentRoutes');
const logger = require('./sidecars/logging/logger');
const monitor = require('./sidecars/monitoring/monitor');
const healthCheck = require('./sidecars/monitoring/health');

const app = express();

// Middleware básico
app.use(cors());
app.use(express.json());

// Middleware de logging
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
    monitor.recordResponseTime(`${req.method}:${req.path}`, duration);
  });
  
  next();
});

// Rutas
app.use('/payments', paymentRoutes);

// Health check endpoint
app.get('/health', async (req, res) => {
  const health = await healthCheck.checkHealth();
  res.status(health.status === 'healthy' ? 200 : 503).json(health);
});

// Endpoint de métricas
app.get('/metrics', (req, res) => {
  res.json(monitor.getMetrics());
});

// Manejo de errores
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ 
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : undefined
  });
});

// Función de inicio
async function startServer() {
  try {
    // Sincronizar la base de datos
    logger.info('Synchronizing database...');
    await sequelize.authenticate();
    await syncModels();
    logger.info('Database synchronized successfully');

    // Iniciar servidor
    const PORT = config.service.port;
    app.listen(PORT, () => {
      logger.info(`Payment service running on port ${PORT}`);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
}

// Manejo de errores no capturados
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  setTimeout(() => process.exit(1), 1000);
});

// Iniciar servidor
startServer();