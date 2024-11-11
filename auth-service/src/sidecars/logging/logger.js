// auth-service/src/sidecars/logging/logger.js
const winston = require('winston');
const path = require('path');

// Formato personalizado para los logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({
    fillExcept: ['message', 'level', 'timestamp', 'label']
  }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    // Logs de error
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    }),
    // Logs de autenticación
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/auth.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true,
      format: winston.format.combine(
        customFormat,
        winston.format.printf(info => {
          const { timestamp, level, message, metadata } = info;
          return `${timestamp} [${level}] [AUTH] ${message} ${JSON.stringify(metadata)}`;
        })
      )
    }),
    // Logs combinados
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true
    })
  ]
});

// Logs a consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    )
  }));
}

// Métodos específicos para auth
logger.auth = {
  login: (userId, success = true) => {
    logger.info(`User login ${success ? 'successful' : 'failed'}`, {
      userId,
      event: 'login',
      success
    });
  },
  register: (userId) => {
    logger.info('New user registered', {
      userId,
      event: 'register'
    });
  },
  tokenValidation: (userId, valid = true) => {
    logger.info(`Token validation ${valid ? 'successful' : 'failed'}`, {
      userId,
      event: 'token_validation',
      valid
    });
  }
};

module.exports = logger;