// auth-service/src/models/index.js
const { Sequelize } = require('sequelize');
const config = require('../config');

const sequelize = new Sequelize(
  config.database.name,
  config.database.user,
  config.database.password,
  {
    host: config.database.host,
    port: config.database.port,
    dialect: config.database.dialect,
    logging: false
  }
);

const db = {
  sequelize,
  Sequelize,
  User: require('./user')
};

module.exports = db;