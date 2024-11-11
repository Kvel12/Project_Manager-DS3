// auth-service/src/models/user.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const User = sequelize.define('User', {
  username: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [3, 50],
      isUsername(value) {
        if (!/^[a-zA-Z0-9_]+$/.test(value)) {
          throw new Error('Username can only contain letters, numbers, and underscores');
        }
      }
    }
  },
  password: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [6, 100] // La contraseña hasheada será más larga
    }
  },
  name: {
    type: DataTypes.STRING,
    allowNull: false,
    validate: {
      notEmpty: true,
      len: [2, 100]
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'active', 'inactive'),
    defaultValue: 'pending',
    allowNull: false
  },
  lastLogin: {
    type: DataTypes.DATE,
    allowNull: true
  },
  loginAttempts: {
    type: DataTypes.INTEGER,
    defaultValue: 0,
    allowNull: false
  },
  lockedUntil: {
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
    beforeCreate: async (user) => {
      // Se puede agregar lógica adicional antes de crear el usuario
      user.status = 'pending';
    },
    afterCreate: async (user) => {
      // Se puede agregar lógica después de crear el usuario
      const logger = require('../sidecars/logging/logger');
      logger.info(`New user created: ${user.id}`);
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['username']
    }
  ]
});

// Métodos de instancia
User.prototype.incrementLoginAttempts = async function() {
  this.loginAttempts += 1;
  if (this.loginAttempts >= 5) {
    this.lockedUntil = new Date(Date.now() + 30 * 60000); // Bloquear por 30 minutos
  }
  await this.save();
};

User.prototype.resetLoginAttempts = async function() {
  this.loginAttempts = 0;
  this.lockedUntil = null;
  await this.save();
};

User.prototype.isLocked = function() {
  return this.lockedUntil && this.lockedUntil > new Date();
};

module.exports = User;