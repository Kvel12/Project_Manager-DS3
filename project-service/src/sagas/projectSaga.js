// project-service/src/sagas/projectSaga.js
const { Project } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const CircuitBreaker = require('../utils/circuitBreaker');
const config = require('../config');

const paymentServiceBreaker = new CircuitBreaker({
  name: 'payment-service',
  timeout: config.services.payment.timeout || 3000,
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
          const response = await fetch(`${config.services.payment.url}/payments/create`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': projectData.authToken, // Asegúrate que este token se pase
              'X-Request-Id': sagaId // Añadir para trazabilidad
            },
            body: JSON.stringify({
              projectId: project.id,
              amount: projectData.budget,
              userId: projectData.userId,
              description: `Payment for project: ${project.title}`
            })
          });

          if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(errorData.message || 'Payment service error');
          }

          return response.json();
        });

        // Actualizar proyecto con ID de pago
        await project.update({
          paymentStatus: 'processing',
          status: 'active',
          paymentIntentId: paymentIntent.id
        });

        logger.info(`Payment intent created for project: ${project.id}`);
        monitor.recordSagaSuccess(sagaId);

        return {
          success: true,
          project,
          paymentIntent
        };

      } catch (error) {
        const sagaError = new Error('PAYMENT_CREATION_FAILED');
        sagaError.originalError = error;
        throw sagaError;
      }

    } catch (error) {
      logger.error(`Project creation saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId, error);

      // Ejecutar compensación
      await this.compensate(error, { project, paymentIntent });

      if (error.message === 'PAYMENT_CREATION_FAILED') {
        throw new Error('Failed to create payment for project');
      }
      throw new Error('Project creation failed');
    }
  }

  async compensate(error, { project, paymentIntent }) {
    logger.info(`Starting compensation for saga: ${project?.id}`);
    monitor.recordEvent('saga_compensation_start', { projectId: project?.id });

    try {
      if (paymentIntent) {
        await paymentServiceBreaker.execute(async () => {
          const response = await fetch(`${config.services.payment.url}/payments/${paymentIntent.id}/cancel`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'Authorization': project.authToken, // Añadir el token aquí también
              'X-Request-Id': `${sagaId}-compensation`
            }
          });
      
          if (!response.ok) {
            logger.error(`Failed to cancel payment intent: ${paymentIntent.id}`);
            monitor.recordEvent('payment_cancellation_failed', { paymentIntentId: paymentIntent.id });
          }
        });
      }

      if (project) {
        await project.update({
          status: 'cancelled',
          paymentStatus: 'failed',
          metadata: {
            compensationReason: error.message,
            compensationTime: new Date()
          }
        });
      }

      logger.info(`Compensation completed for project: ${project?.id}`);
      monitor.recordEvent('saga_compensation_complete', { projectId: project?.id });
    } catch (compensationError) {
      logger.error('Compensation failed:', compensationError);
      monitor.recordEvent('saga_compensation_failed', { 
        projectId: project?.id,
        error: compensationError.message 
      });
    }
  }

  async updateProject(projectId, updateData) {
    const sagaId = `update-project-${projectId}-${Date.now()}`;
    const originalProject = await Project.findByPk(projectId);
    let paymentUpdateIntent = null;

    if (!originalProject) {
      throw new Error('Project not found');
    }

    try {
      logger.info(`Starting project update saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Si hay cambio en el presupuesto, actualizar pago
      if (updateData.budget && updateData.budget !== originalProject.budget) {
        try {
          paymentUpdateIntent = await paymentServiceBreaker.execute(async () => {
            const response = await fetch(`${config.services.payment.url}/payments/${originalProject.paymentIntentId}/update`, {
              method: 'PUT',
              headers: { 
                'Content-Type': 'application/json',
                'Authorization': updateData.authToken
              },
              body: JSON.stringify({
                amount: updateData.budget,
                description: `Updated payment for project: ${originalProject.title}`
              })
            });

            if (!response.ok) {
              const errorData = await response.json().catch(() => ({}));
              throw new Error(errorData.message || 'Payment update failed');
            }

            return response.json();
          });
        } catch (error) {
          const sagaError = new Error('PAYMENT_UPDATE_FAILED');
          sagaError.originalError = error;
          throw sagaError;
        }
      }

      // Actualizar proyecto
      await originalProject.update({
        ...updateData,
        updatedAt: new Date()
      });

      logger.info(`Project updated successfully: ${projectId}`);
      monitor.recordSagaSuccess(sagaId);

      return {
        success: true,
        project: originalProject,
        paymentUpdate: paymentUpdateIntent
      };

    } catch (error) {
      logger.error(`Project update saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId, error);

      await this.compensateUpdate(error, {
        originalProject,
        originalData: originalProject.toJSON(),
        paymentUpdateIntent
      });

      if (error.message === 'PAYMENT_UPDATE_FAILED') {
        throw new Error('Failed to update payment for project');
      }
      throw new Error('Project update failed');
    }
  }

  async compensateUpdate(error, { originalProject, originalData, paymentUpdateIntent }) {
    logger.info(`Starting update compensation for project: ${originalProject.id}`);
    monitor.recordEvent('saga_update_compensation_start', { projectId: originalProject.id });

    try {
      if (paymentUpdateIntent) {
        await paymentServiceBreaker.execute(async () => {
          const response = await fetch(`${config.services.payment.url}/payments/${originalProject.paymentIntentId}/revert`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amount: originalData.budget,
              reason: 'Update compensation'
            })
          });

          if (!response.ok) {
            logger.error(`Failed to revert payment update: ${originalProject.paymentIntentId}`);
            monitor.recordEvent('payment_revert_failed', { paymentIntentId: originalProject.paymentIntentId });
          }
        });
      }

      await originalProject.update({
        ...originalData,
        metadata: {
          ...originalData.metadata,
          lastCompensation: {
            time: new Date(),
            reason: error.message
          }
        }
      });

      logger.info(`Update compensation completed for project: ${originalProject.id}`);
      monitor.recordEvent('saga_update_compensation_complete', { projectId: originalProject.id });
    } catch (compensationError) {
      logger.error('Update compensation failed:', compensationError);
      monitor.recordEvent('saga_update_compensation_failed', {
        projectId: originalProject.id,
        error: compensationError.message
      });
    }
  }

  async deleteProject(projectId, userId) {
    const sagaId = `delete-project-${projectId}-${Date.now()}`;
    let project = null;

    try {
      project = await Project.findOne({
        where: { id: projectId, userId }
      });

      if (!project) {
        throw new Error('Project not found');
      }

      logger.info(`Starting project deletion saga: ${sagaId}`);
      monitor.recordSagaStart(sagaId);

      // Cancel any active payments first
      if (project.paymentIntentId) {
        await paymentServiceBreaker.execute(async () => {
          const response = await fetch(`${config.services.payment.url}/payments/${project.paymentIntentId}/cancel`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
          });

          if (!response.ok) {
            throw new Error('Failed to cancel project payment');
          }
        });
      }

      // Delete the project
      await project.destroy();

      logger.info(`Project deleted successfully: ${projectId}`);
      monitor.recordSagaSuccess(sagaId);

      return { success: true };

    } catch (error) {
      logger.error(`Project deletion saga failed: ${sagaId}`, error);
      monitor.recordSagaFailure(sagaId, error);

      if (project) {
        await project.update({
          status: 'deletion_failed',
          metadata: {
            deletionAttempt: {
              time: new Date(),
              error: error.message
            }
          }
        });
      }

      throw new Error('Project deletion failed');
    }
  }
}

module.exports = new ProjectSaga();