// auth-service/src/index.js
const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/authRoutes');
const monitor = require('./sidecars/monitoring/monitor');
const logger = require('./sidecars/logging/logger');

const app = express();
const PORT = process.env.PORT || 3001;

// Middleware
app.use(cors());
app.use(express.json());

// Monitoring middleware
app.use((req, res, next) => {
  const start = Date.now();
  
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitor.recordRequest(
      res.statusCode < 400,
      duration,
      req.user?.id
    );
  });
  
  next();
});

// Routes
app.use('/auth', authRoutes);

// Monitoring endpoint
app.get('/metrics', (req, res) => {
  res.json(monitor.getMetrics());
});

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'healthy' });
});

// Error handling
app.use((err, req, res, next) => {
  logger.error('Unhandled error:', err);
  res.status(500).json({ message: 'Internal server error' });
});

app.listen(PORT, () => {
  logger.info(`Auth service running on port ${PORT}`);
});