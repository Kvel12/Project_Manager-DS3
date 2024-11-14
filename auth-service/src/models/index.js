// auth-service/src/models/index.js
const sequelize = require('../config/database');
const User = require('./user');

const db = {
  sequelize,
  Sequelize: sequelize.Sequelize,
  User
};

// Inicializar modelos
Object.values(db)
  .filter(model => model?.associate)
  .forEach(model => model.associate(db));

module.exports = db;