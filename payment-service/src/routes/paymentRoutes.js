// payment-service/src/routes/paymentRoutes.js
const express = require('express');
const paymentController = require('../controllers/paymentController');
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

// Validaciones
const createPaymentValidation = validationMiddleware.body({
  projectId: { type: 'number', required: true },
  amount: { type: 'number', required: true, min: 0 },
  userId: { type: 'number', required: true }
});

const updatePaymentValidation = validationMiddleware.body({
  status: { 
    type: 'string', 
    required: true, 
    enum: ['pending', 'processing', 'completed', 'failed', 'refunded'] 
  },
  reason: { type: 'string', required: false }
});

// Rutas públicas
router.get('/health', monitorRoute('healthCheck'), paymentController.healthCheck);

// Rutas protegidas
router.post('/',
  authMiddleware,
  createPaymentValidation,
  monitorRoute('createPayment'),
  paymentController.createPayment
);

router.get('/project/:projectId',
  authMiddleware,
  monitorRoute('getPaymentsByProject'),
  paymentController.getPaymentsByProject
);

router.get('/:id/status',
  authMiddleware,
  monitorRoute('getPaymentStatus'),
  paymentController.getPaymentStatus
);

router.post('/:id/refund',
  authMiddleware,
  monitorRoute('refundPayment'),
  paymentController.refundPayment
);

router.put('/:id/status',
  authMiddleware,
  updatePaymentValidation,
  monitorRoute('updatePaymentStatus'),
  paymentController.updatePaymentStatus
);

// Ruta especial para compensación (usada por SAGA)
router.post('/:id/compensate',
  authMiddleware,
  monitorRoute('compensatePayment'),
  paymentController.compensatePayment
);

// Ruta para métricas (protegida y solo para admins)
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
