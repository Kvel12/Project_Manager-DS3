const winston = require('winston');
const FluentLogger = require('fluent-logger');
const path = require('path');

const fluentConfig = {
  host: process.env.FLUENTD_HOST || 'logging-service',
  port: Number(process.env.FLUENTD_PORT) || 24224,
  timeout: 3.0,
  reconnectInterval: 1000,
  requireAckResponse: false
};

const customFormat = winston.format.combine(
  winston.format.timestamp({
    format: 'YYYY-MM-DD HH:mm:ss.SSS'
  }),
  winston.format.errors({ stack: true }),
  winston.format.json()
);

const winstonLogger = winston.createLogger({
  level: process.env.LOG_LEVEL || 'info',
  format: customFormat,
  defaultMeta: {
    service: 'payment-service',
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

let fluentLogger;
try {
  fluentLogger = FluentLogger.createFluentSender('payment-service', fluentConfig);
  
  fluentLogger.on('connect', () => {
    winstonLogger.info('Connected to Fluentd');
  });
  
  fluentLogger.on('error', (error) => {
    winstonLogger.error('Fluentd error:', error);
  });
} catch (error) {
  winstonLogger.error('Error initializing Fluentd:', error);
}

const createLogFunction = (level) => (message, meta = {}) => {
  winstonLogger[level](message, meta);
  
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

const logger = {
  error: createLogFunction('error'),
  warn: createLogFunction('warn'),
  info: createLogFunction('info'),
  debug: createLogFunction('debug'),
  
  // Funciones específicas de payment
  payment: {
    processed: (paymentId, amount, status) => {
      logger.info('Payment processed', {
        paymentId,
        amount,
        status,
        event: 'payment_processed'
      });
    },
    
    failed: (paymentId, amount, error) => {
      logger.error('Payment failed', {
        paymentId,
        amount,
        error,
        event: 'payment_failed'
      });
    },
    
    refunded: (paymentId, amount) => {
      logger.info('Payment refunded', {
        paymentId,
        amount,
        event: 'payment_refunded'
      });
    },

    webhookReceived: (paymentId, type) => {
      logger.info('Payment webhook received', {
        paymentId,
        type,
        event: 'webhook_received'
      });
    },

    transactionCreated: (transactionId, userId, amount) => {
      logger.info('Transaction created', {
        transactionId,
        userId,
        amount,
        event: 'transaction_created'
      });
    }
  }
};

module.exports = logger;