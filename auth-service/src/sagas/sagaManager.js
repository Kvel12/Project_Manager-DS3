// auth-service/src/sagas/sagaManager.js
const AuthSaga = require('./authSaga');
const logger = require('../sidecars/logging/logger');

class SagaManager {
  constructor() {
    this.activeSagas = new Map();
    this.completedSagas = new Map();
    try {
      this.authSaga = new AuthSaga();
      logger.info('AuthSaga initialized successfully');
    } catch (error) {
      logger.error('Error initializing AuthSaga:', error);
      throw error;
    }
  }

  registerSaga(sagaId, metadata = {}) {
    this.activeSagas.set(sagaId, {
      startTime: Date.now(),
      status: 'STARTED',
      steps: [],
      metadata
    });
    logger.info(`Saga registered: ${sagaId}`);
  }

  completeSaga(sagaId, status = 'COMPLETED') {
    const saga = this.activeSagas.get(sagaId);
    if (!saga) return;

    saga.endTime = Date.now();
    saga.status = status;
    saga.duration = saga.endTime - saga.startTime;

    this.completedSagas.set(sagaId, saga);
    this.activeSagas.delete(sagaId);
    logger.info(`Saga completed: ${sagaId} with status ${status}`);

    this.cleanOldSagas();
  }

  recordStep(sagaId, step) {
    const saga = this.activeSagas.get(sagaId);
    if (saga) {
      saga.steps.push({
        name: step,
        timestamp: Date.now()
      });
      logger.debug(`Step recorded for saga ${sagaId}: ${step}`);
    }
  }

  getSagaStatus(sagaId) {
    return (
      this.activeSagas.get(sagaId) || 
      this.completedSagas.get(sagaId)
    );
  }

  getActiveSagas() {
    return Array.from(this.activeSagas.entries());
  }

  getCompletedSagas() {
    return Array.from(this.completedSagas.entries());
  }

  cleanOldSagas() {
    const oneHourAgo = Date.now() - (60 * 60 * 1000);
    let cleaned = 0;
    for (const [sagaId, saga] of this.completedSagas) {
      if (saga.endTime < oneHourAgo) {
        this.completedSagas.delete(sagaId);
        cleaned++;
      }
    }
    if (cleaned > 0) {
      logger.info(`Cleaned ${cleaned} old sagas`);
    }
  }

  getMetrics() {
    return {
      activeSagas: this.activeSagas.size,
      completedSagas: this.completedSagas.size,
      sagaDetails: {
        active: Object.fromEntries(this.activeSagas),
        completed: Object.fromEntries(this.completedSagas)
      }
    };
  }
}

// Crear y exportar una única instancia
const sagaManager = new SagaManager();
module.exports = sagaManager;