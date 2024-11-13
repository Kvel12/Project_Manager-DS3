// payment-service/src/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    dialect: 'postgres'
  }
);

const Payment = require('./payment')(sequelize);
const PaymentHistory = require('./paymentHistory')(sequelize);


// Definir relaciones después de inicializar los modelos
Payment.hasMany(PaymentHistory, {
  foreignKey: 'paymentId',
  as: 'history'
});

PaymentHistory.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment'
});

module.exports = {
  sequelize,
  Payment,
  PaymentHistory
};