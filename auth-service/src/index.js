// auth-service/src/index.js
const express = require('express');
const cors = require('cors');
const { sequelize } = require('./models');
const authRoutes = require('./routes/');
const logger = require('./sidecars/logging/logger');
const monitor = require('./sidecars/monitoring/monitor');

const app = express();

app.use(cors());
app.use(express.json());

// Logging middleware
app.use((req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    logger.info(`Request processed: ${req.method} ${req.path}`, {
      method: req.method,
      path: req.path,
      statusCode: res.statusCode,
      duration
    });
    monitor.recordResponseTime(`${req.method}:${req.path}`, duration);
  });
  next();
});

app.use('/auth', authRoutes);

// Health check
app.get('/health', async (req, res) => {
  try {
    await sequelize.authenticate();
    res.json({ status: 'healthy' });
  } catch (error) {
    logger.error('Health check failed:', error);
    res.status(503).json({ status: 'unhealthy' });
  }
});

const PORT = process.env.PORT || 3001;

// Sincronizar base de datos y luego iniciar servidor
sequelize.sync({ force: true }) // En producción, usar force: false
  .then(() => {
    app.listen(PORT, () => {
      logger.info(`Auth service running on port ${PORT}`);
    });
  })
  .catch(error => {
    logger.error('Unable to sync database:', error);
    process.exit(1);
  });

// Error handling
process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', { reason });
});

process.on('uncaughtException', (error) => {
  logger.error('Uncaught Exception:', error);
  process.exit(1);
});