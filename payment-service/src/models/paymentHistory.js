// payment-service/src/models/paymentHistory.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const PaymentHistory = sequelize.define('PaymentHistory', {
    paymentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'payments',
        key: 'id'
      }
    },
    oldStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    newStatus: {
      type: DataTypes.STRING,
      allowNull: false
    },
    reason: {
      type: DataTypes.STRING,
      allowNull: true
    },
    metadata: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {}
    }
  }, {
    tableName: 'payment_histories',
    timestamps: true
  });

  return PaymentHistory;
};