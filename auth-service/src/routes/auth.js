// auth-service/src/routes/auth.js
const express = require('express');
const { register, login } = require('../controllers/authController');
const monitor = require('../sidecars/monitoring/monitor');

const router = express.Router();

// Middleware para monitorear las rutas
const monitorRoute = (routeName) => (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    const duration = Date.now() - start;
    monitor.recordResponseTime(routeName, duration);
  });
  next();
};

router.post('/register', monitorRoute('register'), register);
router.post('/login', monitorRoute('login'), login);

// Ruta para verificar salud del servicio
router.get('/health', (req, res) => {
  res.json({ status: 'healthy', timestamp: new Date() });
});

// Ruta para obtener métricas
router.get('/metrics', (req, res) => {
  res.json(monitor.getMetrics());
});

module.exports = router;

