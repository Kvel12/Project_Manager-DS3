// auth-service/src/config/index.js
require('dotenv').config();

const config = {
  service: {
    name: 'auth-service',
    port: process.env.PORT || 3001
  },
  database: {
    host: process.env.DB_HOST || 'localhost',
    port: process.env.DB_PORT || 5432,
    name: process.env.DB_NAME || 'auth_db',
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'postgres',
    dialect: 'postgres'
  },
  jwt: {
    secret: process.env.JWT_SECRET || 'your-secret-key',
    expiresIn: process.env.JWT_EXPIRES_IN || '1h'
  },
  logging: {
    level: process.env.LOG_LEVEL || 'info'
  }
};

module.exports = config;