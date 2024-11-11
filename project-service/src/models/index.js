// project-service/src/models/index.js
const sequelize = require('../config/database');
const Project = require('./project');
const Task = require('./task');

// Definir relaciones
Project.hasMany(Task, { 
  foreignKey: 'projectId',
  as: 'tasks',
  onDelete: 'CASCADE' 
});

Task.belongsTo(Project, { 
  foreignKey: 'projectId',
  as: 'project' 
});

module.exports = {
  sequelize,
  Project,
  Task
};