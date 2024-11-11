// auth-service/src/sagas/sagaManager.js
class SagaManager {
    constructor() {
      this.activeSagas = new Map();
      this.completedSagas = new Map();
    }
  
    registerSaga(sagaId, metadata = {}) {
      this.activeSagas.set(sagaId, {
        startTime: Date.now(),
        status: 'STARTED',
        steps: [],
        metadata
      });
    }
  
    completeSaga(sagaId, status = 'COMPLETED') {
      const saga = this.activeSagas.get(sagaId);
      if (!saga) return;
  
      saga.endTime = Date.now();
      saga.status = status;
      saga.duration = saga.endTime - saga.startTime;
  
      this.completedSagas.set(sagaId, saga);
      this.activeSagas.delete(sagaId);
  
      // Limpiar sagas completadas antiguas
      this.cleanOldSagas();
    }
  
    recordStep(sagaId, step) {
      const saga = this.activeSagas.get(sagaId);
      if (saga) {
        saga.steps.push({
          name: step,
          timestamp: Date.now()
        });
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
      for (const [sagaId, saga] of this.completedSagas) {
        if (saga.endTime < oneHourAgo) {
          this.completedSagas.delete(sagaId);
        }
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
  
  const sagaManager = new SagaManager();
  module.exports = {
    AuthSaga,
    sagaManager
  };