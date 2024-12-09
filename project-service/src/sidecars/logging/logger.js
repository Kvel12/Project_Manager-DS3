// project-service/src/sidecars/logging/logger.js
const winston = require('winston');
const path = require('path');

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: winston.format.combine(
    winston.format.timestamp(),
    winston.format.errors({ stack: true }),
    winston.format.json()
  ),
  defaultMeta: { 
    service: 'project-service',
    environment: process.env.NODE_ENV 
  },
  transports: [
    // Log de errores
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../../logs/error.log'),
      level: 'error',
      maxsize: 5242880, // 5MB
      maxFiles: 5,
    }),
    // Logs generales
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../../logs/combined.log'),
      maxsize: 5242880,
      maxFiles: 5,
    })
  ]
});

// Logs a consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ timestamp, level, message, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ` ${JSON.stringify(metadata)}`;
        }
        return msg;
      })
    )
  }));
}

// Métodos personalizados para logging específico
logger.sagaStart = (sagaId, details) => {
  logger.info(`Saga started: ${sagaId}`, { 
    type: 'SAGA_START',
    sagaId,
    ...details
  });
};

logger.sagaEnd = (sagaId, status, details) => {
  logger.info(`Saga completed: ${sagaId}`, {
    type: 'SAGA_END',
    sagaId,
    status,
    ...details
  });
};

logger.compensation = (sagaId, step, details) => {
  logger.warn(`Executing compensation: ${sagaId}`, {
    type: 'COMPENSATION',
    sagaId,
    step,
    ...details
  });
};

module.exports = logger;