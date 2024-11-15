// payment-service/src/controllers/paymentController.js
const { Payment, PaymentHistory } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const paymentSaga = require('../sagas/paymentSaga');  // Nota: cambiado a minúscula

class PaymentController {
  async createPayment(req, res) {
    const startTime = Date.now();
    try {
      const { projectId, amount, userId } = req.body;
      
      logger.info('Creating payment for project', { projectId, amount, userId });
      
      // Usar la instancia de paymentSaga directamente, no como constructor
      const result = await paymentSaga.processPayment({
        projectId,
        amount,
        userId,
        authToken: req.headers.authorization
      });

      monitor.recordSuccessfulOperation('createPayment');
      logger.info(`Payment created successfully: ${result.payment.id}`);
      
      res.status(201).json({
        id: result.payment.id,
        status: result.payment.status,
        transactionId: result.payment.transactionId,
        amount: result.payment.amount
      });

    } catch (error) {
      monitor.recordFailedOperation('createPayment');
      logger.error('Error creating payment:', error);
      
      res.status(error.status || 500).json({ 
        message: error.message || 'Error processing payment',
        details: error.details
      });
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

      const result = await paymentSaga.processRefund(id, {
        reason,
        authToken: req.headers.authorization
      });

      monitor.recordSuccessfulOperation('refundPayment');
      logger.info(`Payment refunded successfully: ${id}`);
      
      res.status(200).json(result);
    } catch (error) {
      monitor.recordFailedOperation('refundPayment');
      logger.error('Error processing refund:', error);
      
      res.status(error.status || 500).json({ 
        message: error.message || 'Error processing refund'
      });
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
      
      // Registrar el cambio en el historial
      await PaymentHistory.create({
        paymentId: id,
        oldStatus,
        newStatus: status,
        reason,
        metadata: {
          updatedBy: req.user.id,
          timestamp: new Date()
        }
      });

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

  async healthCheck(req, res) {
    try {
      await Payment.findOne();
      res.status(200).json({ status: 'healthy' });
    } catch (error) {
      logger.error('Health check failed:', error);
      res.status(503).json({ status: 'unhealthy' });
    }
  }

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
        errorDetails: { 
          reason, 
          compensationTime: new Date() 
        }
      });
  
      // Registrar en el historial
      await PaymentHistory.create({
        paymentId: id,
        oldStatus,
        newStatus: 'failed',
        reason: `Compensation: ${reason}`,
        metadata: {
          compensationTime: new Date(),
          originalStatus: oldStatus
        }
      });
  
      monitor.recordSuccessfulOperation('compensatePayment');
      logger.info(`Payment compensated: ${id}`, {
        paymentId: id,
        oldStatus,
        reason
      });
      
      res.status(200).json({ 
        message: 'Payment compensated successfully',
        payment: {
          id: payment.id,
          status: payment.status,
          oldStatus
        }
      });
    } catch (error) {
      monitor.recordFailedOperation('compensatePayment');
      logger.error('Error compensating payment:', error);
      res.status(500).json({ message: 'Error compensating payment' });
    }
  }
}

module.exports = new PaymentController();