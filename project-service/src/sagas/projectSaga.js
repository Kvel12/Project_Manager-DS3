// project-service/src/sagas/projectSaga.js
const { Project } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const CircuitBreaker = require('../utils/circuitBreaker');

// Circuit breakers para servicios externos
const paymentServiceBreaker = new CircuitBreaker({
  timeout: 3000,
  errorThreshold: 3,
  resetTimeout: 30000
});

class ProjectSaga {
  async createProject(projectData) {
    const sagaId = `create-project-${Date.now()}`;
    let project = null;
    let paymentIntent = null;

    try {
      logger.info(`Starting project creation saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Paso 1: Crear proyecto en estado draft
      project = await Project.create({
        ...projectData,
        status: 'draft',
        paymentStatus: 'pending'
      });

      logger.info(`Project created in draft state: ${project.id}`);

      // Paso 2: Crear intención de pago
      try {
        paymentIntent = await paymentServiceBreaker.execute(async () => {
          const response = await fetch('http://payment-service:3003/payments/create', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              projectId: project.id,
              amount: projectData.budget,
              userId: projectData.userId
            })
          });

          if (!response.ok) {
            throw new Error('Payment service error');
          }

          return response.json();
        });

        // Actualizar proyecto con ID de pago
        await project.update({
          paymentStatus: 'processing',
          status: 'active'
        });

        logger.info(`Payment intent created for project: ${project.id}`);
        monitor.recordSagaSuccess(sagaId);

        return {
          success: true,
          project,
          paymentIntent
        };

      } catch (error) {
        throw new Error('PAYMENT_CREATION_FAILED');
      }

    } catch (error) {
      logger.error(`Project creation saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId);

      // Ejecutar compensación
      await this.compensate(error, { project, paymentIntent });

      throw new Error('Project creation failed');
    }
  }

  async compensate(error, { project, paymentIntent }) {
    logger.info(`Starting compensation for saga: ${project?.id}`);

    try {
      if (paymentIntent) {
        // Cancelar intención de pago
        await paymentServiceBreaker.execute(async () => {
          const response = await fetch(`http://payment-service:3003/payments/${paymentIntent.id}/cancel`, {
            method: 'POST'
          });

          if (!response.ok) {
            logger.error(`Failed to cancel payment intent: ${paymentIntent.id}`);
          }
        });
      }

      if (project) {
        // Marcar proyecto como cancelado
        await project.update({
          status: 'cancelled',
          paymentStatus: 'failed'
        });
      }

      logger.info(`Compensation completed for project: ${project?.id}`);
    } catch (compensationError) {
      logger.error('Compensation failed:', compensationError);
      // Aquí podrías implementar un sistema de alertas para compensaciones fallidas
    }
  }

  async updateProject(projectId, updateData) {
    const sagaId = `update-project-${projectId}-${Date.now()}`;
    const originalProject = await Project.findByPk(projectId);
    let paymentUpdateIntent = null;

    try {
      logger.info(`Starting project update saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Si hay cambio en el presupuesto, actualizar pago
      if (updateData.budget && updateData.budget !== originalProject.budget) {
        try {
          paymentUpdateIntent = await paymentServiceBreaker.execute(async () => {
            const response = await fetch(`http://payment-service:3003/payments/${projectId}/update`, {
              method: 'PUT',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                amount: updateData.budget
              })
            });

            if (!response.ok) {
              throw new Error('Payment update failed');
            }

            return response.json();
          });
        } catch (error) {
          throw new Error('PAYMENT_UPDATE_FAILED');
        }
      }

      // Actualizar proyecto
      await originalProject.update(updateData);

      logger.info(`Project updated successfully: ${projectId}`);
      monitor.recordSagaSuccess(sagaId);

      return {
        success: true,
        project: originalProject,
        paymentUpdate: paymentUpdateIntent
      };

    } catch (error) {
      logger.error(`Project update saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId);

      // Ejecutar compensación
      await this.compensateUpdate(error, {
        originalProject,
        originalData: originalProject.toJSON(),
        paymentUpdateIntent
      });

      throw new Error('Project update failed');
    }
  }

  async compensateUpdate(error, { originalProject, originalData, paymentUpdateIntent }) {
    logger.info(`Starting update compensation for project: ${originalProject.id}`);

    try {
      if (paymentUpdateIntent) {
        // Revertir actualización de pago
        await paymentServiceBreaker.execute(async () => {
          const response = await fetch(`http://payment-service:3003/payments/${originalProject.id}/revert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: originalData.budget
            })
          });

          if (!response.ok) {
            throw new Error('Payment revert failed');
          }
        });
      }

      // Revertir cambios en el proyecto
      await originalProject.update(originalData);

      logger.info(`Update compensation completed for project: ${originalProject.id}`);
    } catch (compensationError) {
      logger.error('Update compensation failed:', compensationError);
    }
  }
}

module.exports = new ProjectSaga();