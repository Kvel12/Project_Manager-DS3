// auth-service/src/models/index.js
const sequelize = require('../config/database');
const User = require('./user');

module.exports = {
  sequelize,
  User
};