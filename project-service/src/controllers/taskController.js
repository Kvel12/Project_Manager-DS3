// project-service/src/controllers/taskController.js
const { Task, Project } = require('../models');
const logger = require('../sidecars/logging/logger');
const monitor = require('../sidecars/monitoring/monitor');

class TaskController {
  async createTask(req, res) {
    const startTime = Date.now();
    try {
      const { projectId, title, description, priority, completionDate } = req.body;
      const userId = req.user.id;

      // Verificar si el proyecto existe y pertenece al usuario
      const project = await Project.findOne({
        where: { id: projectId, userId }
      });

      if (!project) {
        return res.status(404).json({ message: 'Project not found' });
      }

      const task = await Task.create({
        projectId,
        title,
        description,
        priority,
        completionDate
      });

      monitor.recordSuccessfulOperation('createTask');
      res.status(201).json(task);
    } catch (error) {
      monitor.recordFailedOperation('createTask');
      logger.error('Error creating task:', error);
      res.status(500).json({ message: 'Error creating task' });
    } finally {
      monitor.recordResponseTime('createTask', Date.now() - startTime);
    }
  }

  async updateTask(req, res) {
    try {
      const { id } = req.params;
      const { status, title, description, priority, completionDate } = req.body;
      const userId = req.user.id;

      // Verificar si la tarea existe y pertenece a un proyecto del usuario
      const task = await Task.findOne({
        include: [{
          model: Project,
          as: 'project',
          where: { userId }
        }],
        where: { id }
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await task.update({
        status,
        title,
        description,
        priority,
        completionDate
      });

      monitor.recordSuccessfulOperation('updateTask');
      res.status(200).json(task);
    } catch (error) {
      monitor.recordFailedOperation('updateTask');
      logger.error('Error updating task:', error);
      res.status(500).json({ message: 'Error updating task' });
    }
  }

  async deleteTask(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      // Verificar si la tarea existe y pertenece a un proyecto del usuario
      const task = await Task.findOne({
        include: [{
          model: Project,
          as: 'project',
          where: { userId }
        }],
        where: { id }
      });

      if (!task) {
        return res.status(404).json({ message: 'Task not found' });
      }

      await task.destroy();
      monitor.recordSuccessfulOperation('deleteTask');
      res.status(204).send();
    } catch (error) {
      monitor.recordFailedOperation('deleteTask');
      logger.error('Error deleting task:', error);
      res.status(500).json({ message: 'Error deleting task' });
    }
  }

  async getTasksByProject(req, res) {
    try {
      const { projectId } = req.params;
      const userId = req.user.id;

      const tasks = await Task.findAll({
        include: [{
          model: Project,
          as: 'project',
          where: { id: projectId, userId }
        }]
      });

      monitor.recordSuccessfulOperation('getTasksByProject');
      res.status(200).json(tasks);
    } catch (error) {
      monitor.recordFailedOperation('getTasksByProject');
      logger.error('Error getting tasks:', error);
      res.status(500).json({ message: 'Error getting tasks' });
    }
  }
}

module.exports = new TaskController();