// auth-service/src/sidecars/logging/logger.js
const winston = require('winston');
const path = require('path');

// Formato personalizado para los logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

// Configuración del logger
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
    // Todos los logs
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../../logs/combined.log'),
      maxsize: 5242880, // 5MB
      maxFiles: 5,
      tailable: true
    })
  ],
  // Manejo de excepciones no capturadas
  exceptionHandlers: [
    new winston.transports.File({ 
      filename: path.join(__dirname, '../../../logs/exceptions.log')
    })
  ],
  // No cerrar en excepciones no manejadas
  exitOnError: false
});

// Agregar logs a consola en desarrollo
if (process.env.NODE_ENV !== 'production') {
  logger.add(new winston.transports.Console({
    format: winston.format.combine(
      winston.format.colorize(),
      winston.format.simple(),
      winston.format.printf(({ level, message, timestamp, ...metadata }) => {
        let msg = `${timestamp} [${level}]: ${message}`;
        if (Object.keys(metadata).length > 0) {
          msg += ' ' + JSON.stringify(metadata);
        }
        return msg;
      })
    )
  }));
}

// Método para logs de monitoreo
logger.monitor = (message, metrics) => {
  logger.info(message, { 
    type: 'monitoring',
    metrics
  });
};

module.exports = logger;