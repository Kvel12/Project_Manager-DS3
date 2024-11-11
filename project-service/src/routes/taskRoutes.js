// project-service/src/routes/taskRoutes.js
const express = require('express');
const taskController = require('../controllers/taskController');
const authMiddleware = require('../middleware/authMiddleware');
const validationMiddleware = require('../middleware/validationMiddleware');
const monitor = require('../sidecars/monitoring/monitor');

const router = express.Router();

// Validaciones para tareas
const taskValidation = validationMiddleware.body({
  title: { type: 'string', required: true, min: 3 },
  description: { type: 'string', required: false },
  priority: { type: 'string', enum: ['low', 'medium', 'high'] },
  status: { type: 'string', enum: ['pending', 'in_progress', 'completed', 'cancelled'] },
  completionDate: { type: 'date', required: false },
  projectId: { type: 'number', required: true }
});

// Rutas de tareas
router.post('/',
  authMiddleware,
  taskValidation,
  monitorRoute('createTask'),
  taskController.createTask
);

router.get('/project/:projectId',
  authMiddleware,
  monitorRoute('getTasksByProject'),
  taskController.getTasksByProject
);

router.put('/:id',
  authMiddleware,
  taskValidation,
  monitorRoute('updateTask'),
  taskController.updateTask
);

router.delete('/:id',
  authMiddleware,
  monitorRoute('deleteTask'),
  taskController.deleteTask
);

module.exports = router;

