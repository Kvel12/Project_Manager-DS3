// project-service/src/sagas/sagaManager.js
const EventEmitter = require('events');

class SagaManager extends EventEmitter {
  constructor() {
    super();
    this.activeSagas = new Map();
    this.completedSagas = new Map();
  }

  registerSaga(sagaId, steps) {
    this.activeSagas.set(sagaId, {
      steps,
      currentStep: 0,
      status: 'STARTED',
      startTime: Date.now()
    });
  }

  async executeSaga(sagaId, context) {
    const saga = this.activeSagas.get(sagaId);
    if (!saga) {
      throw new Error(`Saga ${sagaId} not found`);
    }

    try {
      for (const step of saga.steps) {
        await step.execute(context);
        saga.currentStep++;
      }

      this.completeSaga(sagaId, 'COMPLETED');
    } catch (error) {
      await this.compensateSaga(sagaId, context);
      throw error;
    }
  }

  async compensateSaga(sagaId, context) {
    const saga = this.activeSagas.get(sagaId);
    if (!saga) return;

    for (let i = saga.currentStep - 1; i >= 0; i--) {
      try {
        await saga.steps[i].compensate(context);
      } catch (error) {
        logger.error(`Compensation failed for saga ${sagaId} at step ${i}:`, error);
      }
    }

    this.completeSaga(sagaId, 'COMPENSATED');
  }

  completeSaga(sagaId, status) {
    const saga = this.activeSagas.get(sagaId);
    if (!saga) return;

    this.completedSagas.set(sagaId, {
      ...saga,
      status,
      endTime: Date.now(),
      duration: Date.now() - saga.startTime
    });

    this.activeSagas.delete(sagaId);
    this.emit('sagaCompleted', sagaId, status);
  }

  getSagaStatus(sagaId) {
    return this.activeSagas.get(sagaId) || this.completedSagas.get(sagaId);
  }
}

module.exports = new SagaManager();