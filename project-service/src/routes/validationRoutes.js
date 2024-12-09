// project-service/src/routes/validationRoutes.js
const express = require('express');
const { Project } = require('../models');
const authMiddleware = require('../middleware/authMiddleware');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');

const router = express.Router();

// Validación de proyecto para pagos
router.post('/:id/validate',
  authMiddleware,
  async (req, res) => {
    try {
      const { id } = req.params;
      const { amount } = req.body;

      const project = await Project.findByPk(id);

      if (!project) {
        return res.status(404).json({ 
          message: 'Project not found',
          projectId: id
        });
      }

      // Validar estado del proyecto
      if (project.status !== 'draft' && project.status !== 'active') {
        return res.status(400).json({
          message: 'Project is not in a valid state for payment',
          projectId: id,
          currentStatus: project.status
        });
      }

      // Validar monto
      if (amount > project.budget) {
        return res.status(400).json({
          message: 'Payment amount exceeds project budget',
          projectId: id,
          budget: project.budget,
          requestedAmount: amount
        });
      }

      logger.info(`Project validated successfully: ${id}`);
      monitor.recordSuccessfulOperation('validateProject');

      res.json({
        valid: true,
        project: {
          id: project.id,
          status: project.status,
          budget: project.budget,
          currentPaymentStatus: project.paymentStatus
        }
      });

    } catch (error) {
      logger.error('Error validating project:', error);
      monitor.recordFailedOperation('validateProject');
      res.status(500).json({ 
        message: 'Error validating project',
        error: error.message 
      });
    }
  }
);

// Actualización de estado de pago
router.put('/:id/payment-status',
    authMiddleware,
    async (req, res) => {
      try {
        const { id } = req.params;
        const { status, paymentId } = req.body;
  
        const project = await Project.findByPk(id);
  
        if (!project) {
          return res.status(404).json({ 
            message: 'Project not found',
            projectId: id
          });
        }
  
        // Mapear el estado de pago a los valores permitidos
        const paymentStatusMap = {
          'paid': 'completed',
          'failed': 'failed',
          'processing': 'processing',
          'cancelled': 'cancelled',
          'pending': 'pending'
        };
  
        const mappedStatus = paymentStatusMap[status] || 'failed';
  
        await project.update({
          paymentStatus: mappedStatus,
          paymentIntentId: paymentId,
          ...(mappedStatus === 'completed' ? { status: 'active' } : {})
        });
  
        logger.info(`Project payment status updated: ${id}`);
        monitor.recordSuccessfulOperation('updatePaymentStatus');
  
        res.json({
          success: true,
          project: {
            id: project.id,
            status: project.status,
            paymentStatus: mappedStatus
          }
        });
  
      } catch (error) {
        logger.error('Error updating project payment status:', error);
        monitor.recordFailedOperation('updatePaymentStatus');
        res.status(500).json({ 
          message: 'Error updating project payment status',
          error: error.message 
        });
      }
    }
  );

module.exports = router;