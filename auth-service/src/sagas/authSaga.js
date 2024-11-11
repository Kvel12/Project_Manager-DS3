// auth-service/src/sagas/authSaga.js
const User = require('../models/user');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');

class AuthSaga {
  async executeRegistration(userData) {
    let user = null;
    const sagaId = Date.now(); // ID único para rastrear la saga
    
    try {
      logger.info(`Starting registration saga ${sagaId}`);
      monitor.recordEvent('saga_started');

      // Paso 1: Verificar si el usuario ya existe
      const existingUser = await User.findOne({
        where: { username: userData.username }
      });

      if (existingUser) {
        throw new Error('Username already exists');
      }

      // Paso 2: Crear usuario en estado pendiente
      user = await User.create({
        ...userData,
        status: 'pending'
      });

      logger.info(`User created in pending state: ${user.id}`);

      // Paso 3: Validación (simulada)
      await this.simulateValidation(user.id);

      // Paso 4: Activar usuario
      await user.update({ status: 'active' });
      
      logger.info(`Registration saga ${sagaId} completed successfully`);
      monitor.recordEvent('saga_completed');

      return {
        success: true,
        userId: user.id,
        status: 'active'
      };

    } catch (error) {
      logger.error(`Registration saga ${sagaId} failed:`, error);
      monitor.recordEvent('saga_failed');

      // Ejecutar compensación si es necesario
      if (user) {
        await this.compensate(user.id, error);
      }

      throw error;
    }
  }

  async simulateValidation(userId) {
    return new Promise((resolve) => {
      setTimeout(resolve, 100);
    });
  }

  async compensate(userId, error) {
    try {
      logger.info(`Starting compensation for user ${userId}`);
      
      // Marcar usuario como inactivo en lugar de eliminarlo
      await User.update(
        { status: 'inactive' },
        { where: { id: userId } }
      );

      logger.info(`Compensation completed for user ${userId}`);
      monitor.recordEvent('compensation_completed');

    } catch (compensationError) {
      logger.error('Compensation failed:', compensationError);
      monitor.recordEvent('compensation_failed');
      // En caso de error en la compensación, podríamos notificar a un sistema de monitoreo
      throw compensationError;
    }
  }
}

module.exports = new AuthSaga();