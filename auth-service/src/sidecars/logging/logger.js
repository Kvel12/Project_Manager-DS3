const winston = require('winston');
const FluentLogger = require('fluent-logger');
const path = require('path');

// Configuración de Fluentd
const fluentConfig = {
  host: process.env.FLUENTD_HOST || 'logging-service',
  port: Number(process.env.FLUENTD_PORT) || 24224,
  timeout: 3.0,
  reconnectInterval: 1000,
  requireAckResponse: false
};

// Crear el formato personalizado para Winston
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Crear el logger de Winston
const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'auth-service',
    environment: process.env.NODE_ENV
  },
  transports: [
    new winston.transports.Console({
      format: winston.format.combine(
        winston.format.colorize(),
        winston.format.simple()
      )
    })
  ]
});

// Inicializar FluentLogger
let fluentLogger;
try {
  fluentLogger = FluentLogger.createFluentSender('auth-service', fluentConfig);
  
  fluentLogger.on('connect', () => {
    winstonLogger.info('Connected to Fluentd');
  });
  
  fluentLogger.on('error', (error) => {
    winstonLogger.error('Fluentd error:', error);
  });
} catch (error) {
  winstonLogger.error('Error initializing Fluentd:', error);
}

// Crear funciones de logging que usan tanto Winston como Fluentd
const createLogFunction = (level) => (message, meta = {}) => {
  // Log con Winston
  winstonLogger[level](message, meta);
  
  // Log con Fluentd
  if (fluentLogger) {
    const logData = {
      message: typeof message === 'string' ? message : JSON.stringify(message),
      level,
      timestamp: new Date().toISOString(),
      ...meta
    };
    
    fluentLogger.emit(level, logData, (err) => {
      if (err) {
        winstonLogger.error('Error sending log to Fluentd:', err);
      }
    });
  }
};

// Crear el objeto logger con todas las funciones necesarias
const logger = {
  error: createLogFunction('error'),
  warn: createLogFunction('warn'),
  info: createLogFunction('info'),
  debug: createLogFunction('debug'),
  
  // Funciones específicas de auth
  auth: {
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
  }
};

module.exports = logger;