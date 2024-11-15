// payment-service/src/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config');
const logger = require('../sidecars/logging/logger');

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: 'postgres',
    logging: msg => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Importar modelos
const Payment = require('./payment')(sequelize);
const PaymentHistory = require('./paymentHistory')(sequelize);

// Definir relaciones
Payment.hasMany(PaymentHistory, {
  foreignKey: 'paymentId',
  as: 'history',
  onDelete: 'CASCADE'
});

PaymentHistory.belongsTo(Payment, {
  foreignKey: 'paymentId',
  as: 'payment'
});

// Función para sincronizar modelos
const syncModels = async () => {
  try {
    await sequelize.sync({ force: process.env.NODE_ENV === 'development' });
    logger.info('Database models synchronized successfully');
  } catch (error) {
    logger.error('Error synchronizing models:', error);
    throw error;
  }
};

module.exports = {
  sequelize,
  Payment,
  PaymentHistory,
  syncModels
};