// project-service/src/models/project.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Project = sequelize.define('Project', {
  title: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 1000]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('draft', 'active', 'completed', 'cancelled'),
    defaultValue: 'draft',
    allowNull: false
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    allowNull: false
  },
  budget: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      min: 0
    }
  },
  paymentStatus: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed'),
    defaultValue: 'pending',
    allowNull: false
  },
  startDate: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW
  },
  culminationDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
}, {
  hooks: {
    beforeCreate: async (project) => {
      if (!project.startDate) {
        project.startDate = new Date();
      }
    }
  }
});

module.exports = Project;

// project-service/src/models/task.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Task = sequelize.define('Task', {
  title: {
    type: DataTypes.STRING(1000),
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 1000]
    }
  },
  description: {
    type: DataTypes.TEXT,
    allowNull: true
  },
  status: {
    type: DataTypes.ENUM('pending', 'in_progress', 'completed', 'cancelled'),
    defaultValue: 'pending',
    allowNull: false
  },
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false
  },
  assignedTo: {
    type: DataTypes.INTEGER,
    allowNull: true
  },
  priority: {
    type: DataTypes.ENUM('low', 'medium', 'high'),
    defaultValue: 'medium',
    allowNull: false
  },
  completionDate: {
    type: DataTypes.DATE,
    allowNull: true
  },
  createdAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  },
  updatedAt: {
    type: DataTypes.DATE,
    defaultValue: DataTypes.NOW
  }
});

module.exports = Task;

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