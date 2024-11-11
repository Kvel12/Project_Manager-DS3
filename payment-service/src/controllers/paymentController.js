// payment-service/src/controllers/paymentController.js
const { Payment, PaymentHistory } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const PaymentSaga = require('../sagas/paymentSaga');

class PaymentController {
  async createPayment(req, res) {
    const startTime = Date.now();
    try {
      const { projectId, amount, userId } = req.body;
      
      // Iniciar SAGA para procesamiento de pago
      const saga = new PaymentSaga();
      const result = await saga.processPayment({
        projectId,
        amount,
        userId
      });

      monitor.recordSuccessfulOperation('createPayment');
      logger.info(`Payment created successfully: ${result.payment.id}`);
      
      res.status(201).json(result.payment);
    } catch (error) {
      monitor.recordFailedOperation('createPayment');
      logger.error('Error creating payment:', error);
      
      if (error.name === 'SagaExecutionFailed') {
        return res.status(400).json({
          message: 'Payment processing failed',
          details: error.compensationResults
        });
      }
      
      res.status(500).json({ message: 'Error processing payment' });
    } finally {
      monitor.recordResponseTime('createPayment', Date.now() - startTime);
    }
  }

  async getPaymentsByProject(req, res) {
    try {
      const { projectId } = req.params;
      const payments = await Payment.findAll({
        where: { projectId },
        include: [{
          model: PaymentHistory,
          as: 'history'
        }],
        order: [['createdAt', 'DESC']]
      });

      monitor.recordSuccessfulOperation('getPaymentsByProject');
      res.status(200).json(payments);
    } catch (error) {
      monitor.recordFailedOperation('getPaymentsByProject');
      logger.error('Error fetching payments:', error);
      res.status(500).json({ message: 'Error fetching payments' });
    }
  }

  async getPaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const payment = await Payment.findByPk(id, {
        include: [{
          model: PaymentHistory,
          as: 'history'
        }]
      });

      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      monitor.recordSuccessfulOperation('getPaymentStatus');
      res.status(200).json({
        id: payment.id,
        status: payment.status,
        projectId: payment.projectId,
        amount: payment.amount,
        history: payment.history
      });
    } catch (error) {
      monitor.recordFailedOperation('getPaymentStatus');
      logger.error('Error fetching payment status:', error);
      res.status(500).json({ message: 'Error fetching payment status' });
    }
  }

  async refundPayment(req, res) {
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const saga = new PaymentSaga();
      const result = await saga.processRefund(id, reason);

      monitor.recordSuccessfulOperation('refundPayment');
      logger.info(`Payment refunded successfully: ${id}`);
      
      res.status(200).json(result);
    } catch (error) {
      monitor.recordFailedOperation('refundPayment');
      logger.error('Error processing refund:', error);
      
      if (error.name === 'SagaExecutionFailed') {
        return res.status(400).json({
          message: 'Refund processing failed',
          details: error.compensationResults
        });
      }
      
      res.status(500).json({ message: 'Error processing refund' });
    } finally {
      monitor.recordResponseTime('refundPayment', Date.now() - startTime);
    }
  }

  async updatePaymentStatus(req, res) {
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const { status, reason } = req.body;

      const payment = await Payment.findByPk(id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      const oldStatus = payment.status;
      await payment.update({ status });
      await payment.addToHistory(oldStatus, reason);

      monitor.recordSuccessfulOperation('updatePaymentStatus');
      logger.info(`Payment status updated: ${id} (${oldStatus} -> ${status})`);
      
      res.status(200).json(payment);
    } catch (error) {
      monitor.recordFailedOperation('updatePaymentStatus');
      logger.error('Error updating payment status:', error);
      res.status(500).json({ message: 'Error updating payment status' });
    } finally {
      monitor.recordResponseTime('updatePaymentStatus', Date.now() - startTime);
    }
  }

  // Endpoint para compensación (usado por SAGA)
  async compensatePayment(req, res) {
    try {
      const { id } = req.params;
      const { reason } = req.body;

      const payment = await Payment.findByPk(id);
      if (!payment) {
        return res.status(404).json({ message: 'Payment not found' });
      }

      const oldStatus = payment.status;
      await payment.update({ 
        status: 'failed',
        errorDetails: { reason, compensationTime: new Date() }
      });
      await payment.addToHistory(oldStatus, 'Compensation: ' + reason);

      monitor.recordSuccessfulOperation('compensatePayment');
      logger.info(`Payment compensated: ${id}`);
      
      res.status(200).json({ message: 'Payment compensated successfully' });
    } catch (error) {
      monitor.recordFailedOperation('compensatePayment');
      logger.error('Error compensating payment:', error);
      res.status(500).json({ message: 'Error compensating payment' });
    }
  }

  // Health check endpoint
  async healthCheck(req, res) {
    try {
      await Payment.findOne();
      res.status(200).json({ status: 'healthy' });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({ status: 'unhealthy' });
    }
  }
}

module.exports = new PaymentController();