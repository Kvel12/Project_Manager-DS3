const express = require('express');
const authController = require('../controllers/authController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const monitor = require('../sidecars/monitoring/monitor');

const router = express.Router();

// Middleware para monitoreo de rutas
const monitorRoute = (routeName) => (req, res, next) => {
  const start = Date.now();
  res.on('finish', () => {
    monitor.recordResponseTime(routeName, Date.now() - start);
    monitor.recordStatusCode(routeName, res.statusCode);
  });
  next();
};

// Esquemas de validación
const registrationSchema = {
  username: { 
    type: 'string', 
    required: true, 
    min: 3, 
    max: 50,
    pattern: '^[a-zA-Z0-9_]+$'
  },
  password: { 
    type: 'string', 
    required: true, 
    min: 6 
  },
  name: { 
    type: 'string', 
    required: true, 
    min: 2, 
    max: 100 
  },
  email: { 
    type: 'string', 
    required: true, 
    email: true 
  }
};

const loginSchema = {
  username: { 
    type: 'string', 
    required: true 
  },
  password: { 
    type: 'string', 
    required: true 
  }
};

// Rutas públicas
router.post('/register',
  validationMiddleware.validateBody(registrationSchema),
  monitorRoute('register'),
  authController.register
);

router.post('/login',
  validationMiddleware.validateBody(loginSchema),
  monitorRoute('login'),
  authController.login
);

// Ruta de validación de token
router.get('/validate',
  monitorRoute('validate'),
  authController.validate
);

// Rutas protegidas
router.get('/profile',
  authMiddleware,
  monitorRoute('getUserProfile'),
  authController.getUserProfile
);

// Health check
router.get('/health',
  monitorRoute('healthCheck'),
  authController.healthCheck
);

// Métricas (protegida y solo para admins)
router.get('/metrics',
  authMiddleware,
  (req, res, next) => {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Access denied' });
    }
    next();
  },
  (req, res) => {
    res.json(monitor.getMetrics());
  }
);

module.exports = router;