// payment-service/src/sidecars/logging/logger.js
const winston = require('winston');
const path = require('path');

// Formato personalizado para logs
const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss'
  }),
  winston.format.errors({ stack: true }),
  winston.format.metadata({ fillExcept: ['message', 'level', 'timestamp'] }),
  winston.format.json()
);

const logger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'payment-service',
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
    // Logs de transacciones
    new winston.transports.File({
      filename: path.join(__dirname, '../../../logs/transactions.log'),
      level: 'info',
      maxsize: 5242880,
      maxFiles: 5,
      tailable: true,
      format: winston.format.combine(
        customFormat,
        winston.format.printf(info => {
          if (info.metadata.transactionId) {
            return `${info.timestamp} [${info.level}] [Transaction ${info.metadata.transactionId}]: ${info.message}`;
          }
          return `${info.timestamp} [${info.level}]: ${info.message}`;
        })
      )
    }),
    // Todos los logs
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
          msg += `\n${JSON.stringify(metadata, null, 2)}`;
        }
        return msg;
      })
    )
  }));
}

// Métodos específicos para logging de pagos
logger.payment = {
  start: (paymentId, details) => {
    logger.info(`Payment process started: ${paymentId}`, {
      transactionId: paymentId,
      type: 'PAYMENT_START',
      ...details
    });
  },
  success: (paymentId, details) => {
    logger.info(`Payment successful: ${paymentId}`, {
      transactionId: paymentId,
      type: 'PAYMENT_SUCCESS',
      ...details
    });
  },
  failure: (paymentId, error, details) => {
    logger.error(`Payment failed: ${paymentId}`, {
      transactionId: paymentId,
      type: 'PAYMENT_FAILURE',
      error: error.message,
      stack: error.stack,
      ...details
    });
  },
  refund: (paymentId, details) => {
    logger.info(`Payment refund initiated: ${paymentId}`, {
      transactionId: paymentId,
      type: 'PAYMENT_REFUND',
      ...details
    });
  }
};

module.exports = logger;
