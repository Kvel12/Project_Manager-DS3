// auth-service/src/sagas/authSaga.js
const { User } = require('../models');
const jwt = require('jsonwebtoken');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');

class AuthSaga {
  async executeRegistration(userData) {
    const sagaId = `reg-${Date.now()}`;
    let user = null;

    try {
      logger.info(`Starting registration saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Paso 1: Crear usuario en estado pendiente
      user = await User.create({
        ...userData,
        status: 'pending'
      });

      logger.info(`User created in pending state: ${user.id}`);

      // Paso 2: Validación simulada (aquí podrías agregar validación de email, etc.)
      await this.simulateValidation(user.id);

      // Paso 3: Activar usuario
      await user.update({ 
        status: 'active' 
      });

      // Paso 4: Generar token
      const token = jwt.sign(
        { 
          userId: user.id,
          role: user.role
        },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );

      logger.info(`Registration saga completed successfully: ${sagaId}`);
      monitor.recordSagaSuccess(sagaId);

      return {
        success: true,
        user,
        token
      };

    } catch (error) {
      logger.error(`Registration saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId);

      // Ejecutar compensación
      await this.compensate(user, error);
      throw error;
    }
  }

  async compensate(user, error) {
    logger.info(`Starting compensation for user: ${user?.id}`);
    monitor.recordEvent('saga_compensation_started');

    try {
      if (user) {
        // En lugar de eliminar el usuario, lo marcamos como inactivo
        await user.update({
          status: 'inactive',
          metadata: {
            compensationReason: error.message,
            compensationTime: new Date()
          }
        });

        logger.info(`User marked as inactive: ${user.id}`);
      }

      monitor.recordEvent('saga_compensation_completed');
    } catch (compensationError) {
      logger.error('Compensation failed:', compensationError);
      monitor.recordEvent('saga_compensation_failed');
      // Aquí podrías implementar un sistema de alertas para compensaciones fallidas
    }
  }

  async simulateValidation(userId) {
    // Simulación de proceso de validación
    await new Promise((resolve) => setTimeout(resolve, 100));
    logger.info(`Validation completed for user: ${userId}`);
    return true;
  }
}