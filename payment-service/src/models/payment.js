// payment-service/src/models/payment.js
const { DataTypes } = require('sequelize');
const sequelize = require('../config/database');

const Payment = sequelize.define('Payment', {
  projectId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'Project ID is required' }
    }
  },
  userId: {
    type: DataTypes.INTEGER,
    allowNull: false,
    validate: {
      notNull: { msg: 'User ID is required' }
    }
  },
  amount: {
    type: DataTypes.DECIMAL(10, 2),
    allowNull: false,
    validate: {
      notNull: { msg: 'Amount is required' },
      min: { args: [0], msg: 'Amount must be greater than 0' }
    }
  },
  status: {
    type: DataTypes.ENUM('pending', 'processing', 'completed', 'failed', 'refunded'),
    defaultValue: 'pending',
    allowNull: false
  },
  paymentMethod: {
    type: DataTypes.ENUM('credit_card', 'debit_card', 'bank_transfer'),
    allowNull: true
  },
  transactionId: {
    type: DataTypes.STRING,
    unique: true,
    allowNull: true
  },
  description: {
    type: DataTypes.STRING,
    allowNull: true
  },
  metadata: {
    type: DataTypes.JSONB,
    allowNull: true,
    defaultValue: {}
  },
  errorDetails: {
    type: DataTypes.JSONB,
    allowNull: true
  },
  completedAt: {
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
    beforeCreate: async (payment) => {
      payment.transactionId = `PAY-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    },
    afterUpdate: async (payment) => {
      if (payment.status === 'completed' && payment.changed('status')) {
        payment.completedAt = new Date();
      }
    }
  },
  indexes: [
    {
      unique: true,
      fields: ['transactionId']
    },
    {
      fields: ['projectId']
    },
    {
      fields: ['userId']
    },
    {
      fields: ['status']
    }
  ]
});