// project-service/src/controllers/projectController.js
const { Project, Task } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const ProjectSaga = require('../sagas/projectSaga');
const CircuitBreaker = require('../utils/circuitBreaker');

// Circuit breaker para llamadas al payment-service
const paymentServiceBreaker = new CircuitBreaker({
  timeout: 3000,
  errorThreshold: 3,
  resetTimeout: 30000
});

class ProjectController {
  async createProject(req, res) {
    const startTime = Date.now();
    try {
      const { title, description, priority, culminationDate, budget } = req.body;
      const userId = req.user.id;

      // Iniciar SAGA para creación de proyecto
      const saga = new ProjectSaga();
      const result = await saga.createProject({
        title,
        description,
        priority,
        culminationDate,
        budget,
        userId
      });

      monitor.recordSuccessfulOperation('createProject');
      logger.info(`Project created successfully: ${result.project.id}`);
      
      res.status(201).json(result.project);
    } catch (error) {
      monitor.recordFailedOperation('createProject');
      logger.error('Error creating project:', error);
      
      if (error.name === 'SagaExecutionFailed') {
        return res.status(400).json({ 
          message: 'Failed to create project',
          details: error.compensationResults 
        });
      }
      
      res.status(500).json({ message: 'Error creating project' });
    } finally {
      monitor.recordResponseTime('createProject', Date.now() - startTime);
    }
  }

  async getAllProjects(req, res) {
    try {
      const userId = req.user.id;
      const projects = await Project.findAll({
        where: { userId },
        include: [{
          model: Task,
          as: 'tasks'
        }]
      });

      monitor.recordSuccessfulOperation('getAllProjects');
      res.status(200).json(projects);
    } catch (error) {
      monitor.recordFailedOperation('getAllProjects');
      logger.error('Error getting projects:', error);
      res.status(500).json({ message: 'Error getting projects' });
    }
  }

  async getProjectById(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      const project = await Project.findOne({
        where: { id, userId },
        include: [{
          model: Task,
          as: 'tasks'
        }]
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      monitor.recordSuccessfulOperation('getProjectById');
      res.status(200).json(project);
    } catch (error) {
      monitor.recordFailedOperation('getProjectById');
      logger.error('Error getting project:', error);
      res.status(500).json({ message: 'Error getting project' });
    }
  }

  async updateProject(req, res) {
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      // Verificar si el proyecto existe y pertenece al usuario
      const project = await Project.findOne({
        where: { id, userId }
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      // Si hay cambio en el presupuesto, usar SAGA
      if (updateData.budget && updateData.budget !== project.budget) {
        const saga = new ProjectSaga();
        const result = await saga.updateProject(id, updateData);
        res.status(200).json(result.project);
      } else {
        // Actualización simple sin SAGA
        await project.update(updateData);
        res.status(200).json(project);
      }

      monitor.recordSuccessfulOperation('updateProject');
    } catch (error) {
      monitor.recordFailedOperation('updateProject');
      logger.error('Error updating project:', error);
      
      if (error.name === 'SagaExecutionFailed') {
        return res.status(400).json({ 
          message: 'Failed to update project',
          details: error.compensationResults 
        });
      }
      
      res.status(500).json({ message: 'Error updating project' });
    } finally {
      monitor.recordResponseTime('updateProject', Date.now() - startTime);
    }
  }

  async deleteProject(req, res) {
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Iniciar SAGA para eliminación de proyecto
      const saga = new ProjectSaga();
      await saga.deleteProject(id, userId);

      monitor.recordSuccessfulOperation('deleteProject');
      res.status(204).send();
    } catch (error) {
      monitor.recordFailedOperation('deleteProject');
      logger.error('Error deleting project:', error);
      
      if (error.name === 'SagaExecutionFailed') {
        return res.status(400).json({ 
          message: 'Failed to delete project',
          details: error.compensationResults 
        });
      }
      
      res.status(500).json({ message: 'Error deleting project' });
    } finally {
      monitor.recordResponseTime('deleteProject', Date.now() - startTime);
    }
  }

  // Endpoint para verificar el estado del pago de un proyecto
  async checkPaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      try {
        const paymentStatus = await paymentServiceBreaker.execute(async () => {
          const response = await fetch(`http://payment-service:3003/payments/status/${id}`);
          if (!response.ok) throw new Error('Payment service error');
          return response.json();
        });

        res.status(200).json(paymentStatus);
      } catch (error) {
        if (error.name === 'CircuitBreakerError') {
          logger.warn('Payment service circuit breaker is open');
          res.status(503).json({ message: 'Payment service is temporarily unavailable' });
        } else {
          throw error;
        }
      }
    } catch (error) {
      logger.error('Error checking payment status:', error);
      res.status(500).json({ message: 'Error checking payment status' });
    }
  }
}

module.exports = new ProjectController();