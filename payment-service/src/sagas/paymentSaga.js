// payment-service/src/sagas/paymentSaga.js
const { Payment } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const CircuitBreaker = require('../utils/circuitBreaker');
const config = require('../config');

// Circuit breakers para servicios externos
const projectServiceBreaker = new CircuitBreaker({
  name: 'payment-service',
  timeout: 10000, // Aumentado a 10 segundos
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
        const response = await fetch(`${config.services.project.url}/projects/${paymentData.projectId}/validate`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': paymentData.authToken 
          },
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
        const response = await fetch(`${config.services.project.url}/projects/${paymentData.projectId}/payment-status`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': paymentData.authToken 
          },
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
          const response = await fetch(`${config.services.project.url}/projects/${paymentData.projectId}/payment-status`, {
            method: 'PUT',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': paymentData.authToken 
            },
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