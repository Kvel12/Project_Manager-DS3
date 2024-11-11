// payment-service/src/models/index.js
const sequelize = require('../config/database');
const Payment = require('./payment');
const PaymentHistory = require('./paymentHistory');

// Definir relaciones
Payment.hasMany(PaymentHistory, {
  foreignKey: 'paymentId',
  as: 'history'
});

PaymentHistory.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment'
});

// Método para registrar cambios en el historial
Payment.prototype.addToHistory = async function(oldStatus, reason = null, metadata = null) {
  await PaymentHistory.create({
    paymentId: this.id,
    oldStatus,
    newStatus: this.status,
    reason,
    metadata
  });
};

module.exports = {
  sequelize,
  Payment,
  PaymentHistory
};