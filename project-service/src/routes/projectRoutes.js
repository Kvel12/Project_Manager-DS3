// project-service/src/routes/projectRoutes.js
const express = require('express');
const projectController = require('../controllers/projectController');
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

// Validaciones para proyecto
const projectValidation = validationMiddleware.body({
  title: { type: 'string', required: true, min: 3 },
  description: { type: 'string', required: false },
  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
  budget: { type: 'number', required: true, min: 0 },
  culminationDate: { type: 'date', required: false }
});

// Debug endpoint para verificar la configuración
router.get('/debug/config', authMiddleware, (req, res) => {
  res.json({
    authServiceUrl: config.services.auth.url,
    environment: config.service.environment,
    user: req.user
  });
});

// Debug endpoint para verificar el token
router.get('/debug/token', (req, res) => {
  const token = req.header('Authorization')?.replace('Bearer ', '');
  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    res.json({ decoded });
  } catch (error) {
    res.status(401).json({ error: error.message });
  }
});

// Rutas de proyectos
router.post('/', 
  authMiddleware, 
  projectValidation,
  monitorRoute('createProject'),
  projectController.createProject
);

router.get('/',
  authMiddleware,
  monitorRoute('getAllProjects'),
  projectController.getAllProjects
);

router.get('/:id',
  authMiddleware,
  monitorRoute('getProjectById'),
  projectController.getProjectById
);

router.put('/:id',
  authMiddleware,
  projectValidation,
  monitorRoute('updateProject'),
  projectController.updateProject
);

router.delete('/:id',
  authMiddleware,
  monitorRoute('deleteProject'),
  projectController.deleteProject
);

// Ruta para verificar estado de pago
router.get('/:id/payment-status',
  authMiddleware,
  monitorRoute('checkPaymentStatus'),
  projectController.checkPaymentStatus
);

// Ruta para métricas del servicio
router.get('/metrics',
  authMiddleware,
  (req, res) => {
    res.json(monitor.getMetrics());
  }
);

module.exports = router;

