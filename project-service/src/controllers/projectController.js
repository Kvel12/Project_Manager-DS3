// project-service/src/controllers/projectController.js
const { Project, Task } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');
const projectSaga = require('../sagas/projectSaga'); // Import the instance
const CircuitBreaker = require('../utils/circuitBreaker');

const paymentServiceBreaker = new CircuitBreaker({
  name: 'payment-service',
  timeout: 10000,
  errorThreshold: 3,
  resetTimeout: 30000
});


class ProjectController {
  async createProject(req, res) {
    const startTime = Date.now();
    try {
      const { title, description, priority, budget, teamId } = req.body;
      const userId = req.user.id;

      if(req.user.role !== 'admin'){
        return res.status(403).json({messagge: 'Only admins can create projects'})
      }
  
      logger.info(`Creating project for user: ${userId}`);
  
      const result = await projectSaga.createProject({
        title,
        description,
        priority,
        budget,
        teamId,
        userId,
        authToken: req.headers.authorization // Pasar el token original
      });
  
      monitor.recordSuccessfulOperation('createProject');
      res.status(201).json(result.project);
    } catch (error) {
      monitor.recordFailedOperation('createProject');
      logger.error('Error creating project:', error);
      res.status(500).json({ message: 'Error creating project' });
    } finally {
      monitor.recordResponseTime('createProject', Date.now() - startTime);
    }
  }

  async checkPaymentStatus(req, res) {
    try {
      const { id } = req.params;
      const project = await Project.findOne({
        where: { 
          id,
          userId: req.user.id
        }
      });
  
      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }
  
      res.json({
        projectId: project.id,
        status: project.status,
        paymentStatus: project.paymentStatus,
        paymentIntentId: project.paymentIntentId
      });
  
    } catch (error) {
      logger.error('Error checking payment status:', error);
      res.status(500).json({ message: 'Error checking payment status' });
    }
  }

  async getAllProjects(req, res) {
    try {
      let projects;
      if (req.user.role === 'admin') {
        projects = await Project.findAll({
          include: [{ model: Task, as: 'tasks' }]
        });
      } else if (req.user.role === 'developer') {
        projects = await Project.findAll({
          include: [{
            model: Task,
            as: 'tasks',
            where: { assignedTo: req.user.id }
          }]
        });
      } else {
        return res.status(403).json({ message: 'Access denied' });
      }
  
      res.status(200).json(projects);
    } catch (error) {
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
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update/delete projects' });
    }    
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const userId = req.user.id;
      const updateData = req.body;

      const project = await Project.findOne({
        where: { id, userId }
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      if (updateData.budget && updateData.budget !== project.budget) {
        const result = await projectSaga.updateProject(id, updateData);
        res.status(200).json(result.project);
      } else {
        await project.update(updateData);
        res.status(200).json(project);
      }

      monitor.recordSuccessfulOperation('updateProject');
    } catch (error) {
      monitor.recordFailedOperation('updateProject');
      logger.error('Error updating project:', error);
      res.status(500).json({ message: 'Error updating project' });
    } finally {
      monitor.recordResponseTime('updateProject', Date.now() - startTime);
    }
  }

  async deleteProject(req, res) {
    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Only admins can update/delete projects' });
    }    
    const startTime = Date.now();
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await projectSaga.deleteProject(id, userId);

      monitor.recordSuccessfulOperation('deleteProject');
      res.status(204).send();
    } catch (error) {
      monitor.recordFailedOperation('deleteProject');
      logger.error('Error deleting project:', error);
      res.status(500).json({ message: 'Error deleting project' });
    } finally {
      monitor.recordResponseTime('deleteProject', Date.now() - startTime);
    }
  }

  async checkPaymentStatus(req, res) {
    try {
      const { id } = req.params;

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
        logger.error('Error checking payment status:', error);
        res.status(500).json({ message: 'Error checking payment status' });
      }
    }
  }
}

module.exports = new ProjectController();