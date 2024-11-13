// payment-service/src/sagas/paymentSaga.js
const { Payment } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const CircuitBreaker = require('../utils/circuitBreaker');

// Circuit breakers para servicios externos
const projectServiceBreaker = new CircuitBreaker({
  timeout: 3000,
  errorThreshold: 3,
  resetTimeout: 30000
});

class PaymentSaga {
  async processPayment(paymentData) {
    const sagaId = `payment-${Date.now()}`;
    let payment = null;
    let projectUpdated = false;

    try {
      logger.info(`Starting payment saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Paso 1: Crear registro de pago inicial
      payment = await Payment.create({
        ...paymentData,
        status: 'pending'
      });

      // Paso 2: Verificar proyecto
      await projectServiceBreaker.execute(async () => {
        const response = await fetch(`http://project-service:3002/projects/${paymentData.projectId}/validate`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ amount: paymentData.amount })
        });

        if (!response.ok) {
          throw new Error('Project validation failed');
        }
      });

      // Paso 3: Procesar pago (simulado)
      await this.simulatePaymentProcessing(payment);

      // Paso 4: Actualizar estado del proyecto
      await projectServiceBreaker.execute(async () => {
        const response = await fetch(`http://project-service:3002/projects/${paymentData.projectId}/payment-status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'paid',
            paymentId: payment.id
          })
        });

        if (!response.ok) {
          throw new Error('Project update failed');
        }
        projectUpdated = true;
      });

      // Paso 5: Finalizar pago exitoso
      await payment.update({
        status: 'completed',
        completedAt: new Date()
      });

      logger.info(`Payment saga completed successfully: ${sagaId}`);
      monitor.recordSagaSuccess(sagaId);

      return {
        success: true,
        payment
      };

    } catch (error) {
      logger.error(`Payment saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId);

      // Ejecutar compensación
      await this.compensate(error, { payment, projectUpdated, paymentData });
      throw error;
    }
  }

  async compensate(error, { payment, projectUpdated, paymentData }) {
    logger.info(`Starting compensation for payment saga: ${payment?.id}`);

    try {
      // Compensar actualización del proyecto si fue actualizado
      if (projectUpdated) {
        await projectServiceBreaker.execute(async () => {
          const response = await fetch(`http://project-service:3002/projects/${paymentData.projectId}/payment-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'payment_failed',
              paymentId: payment.id
            })
          });

          if (!response.ok) {
            logger.error('Project compensation failed');
          }
        });
      }

      // Actualizar estado del pago a fallido
      if (payment) {
        await payment.update({
          status: 'failed',
          errorDetails: {
            error: error.message,
            compensationTime: new Date()
          }
        });
      }

      logger.info(`Compensation completed for payment: ${payment?.id}`);
    } catch (compensationError) {
      logger.error('Compensation failed:', compensationError);
      monitor.recordEvent('compensation_failed');
      // Aquí podrías implementar un sistema de alertas para compensaciones fallidas
    }
  }

  async processRefund(paymentId, reason) {
    const sagaId = `refund-${paymentId}-${Date.now()}`;
    let payment = null;
    let projectRefunded = false;

    try {
      logger.info(`Starting refund saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Paso 1: Obtener y verificar pago
      payment = await Payment.findByPk(paymentId);
      if (!payment || payment.status !== 'completed') {
        throw new Error('Payment not eligible for refund');
      }

      // Paso 2: Iniciar reembolso
      await payment.update({ status: 'processing_refund' });

      // Paso 3: Actualizar proyecto
      await projectServiceBreaker.execute(async () => {
        const response = await fetch(`http://project-service:3002/projects/${payment.projectId}/payment-status`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ 
            status: 'refunded',
            paymentId: payment.id
          })
        });

        if (!response.ok) {
          throw new Error('Project refund update failed');
        }
        projectRefunded = true;
      });

      // Paso 4: Finalizar reembolso
      await payment.update({
        status: 'refunded',
        metadata: {
          ...payment.metadata,
          refundReason: reason,
          refundDate: new Date()
        }
      });

      logger.info(`Refund saga completed successfully: ${sagaId}`);
      monitor.recordSagaSuccess(sagaId);

      return {
        success: true,
        payment
      };

    } catch (error) {
      logger.error(`Refund saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId);

      // Ejecutar compensación
      await this.compensateRefund(error, { payment, projectRefunded });
      throw error;
    }
  }

  async compensateRefund(error, { payment, projectRefunded }) {
    logger.info(`Starting refund compensation for payment: ${payment?.id}`);

    try {
      // Compensar actualización del proyecto si fue refunded
      if (projectRefunded) {
        await projectServiceBreaker.execute(async () => {
          const response = await fetch(`http://project-service:3002/projects/${payment.projectId}/payment-status`, {
            method: 'PUT',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ 
              status: 'refund_failed',
              paymentId: payment.id
            })
          });

          if (!response.ok) {
            logger.error('Project refund compensation failed');
          }
        });
      }

      // Restaurar estado original del pago
      if (payment) {
        await payment.update({
          status: 'completed',
          metadata: {
            ...payment.metadata,
            refundAttemptFailed: true,
            refundFailureReason: error.message
          }
        });
      }

      logger.info(`Refund compensation completed for payment: ${payment?.id}`);
    } catch (compensationError) {
      logger.error('Refund compensation failed:', compensationError);
      monitor.recordEvent('refund_compensation_failed');
    }
  }

  async simulatePaymentProcessing(payment) {
    // Simulación de procesamiento de pago
    return new Promise((resolve) => {
      setTimeout(async () => {
        await payment.update({ status: 'processing' });
        resolve();
      }, 1000);
    });
  }
}

module.exports = new PaymentSaga();