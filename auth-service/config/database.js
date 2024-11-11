// auth-service/src/config/database.js
const { Sequelize } = require('sequelize');
const logger = require('../sidecars/logging/logger');

const sequelize = new Sequelize(
  process.env.DB_NAME || 'auth_db',
  process.env.DB_USER || 'postgres',
  process.env.DB_PASSWORD || 'password',
  {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    logging: (msg) => logger.debug(msg),
    pool: {
      max: 5,
      min: 0,
      acquire: 30000,
      idle: 10000
    }
  }
);

// Probar conexión
sequelize
  .authenticate()
  .then(() => {
    logger.info('Database connection established successfully.');
  })
  .catch(err => {
    logger.error('Unable to connect to the database:', err);
  });

module.exports = sequelize;