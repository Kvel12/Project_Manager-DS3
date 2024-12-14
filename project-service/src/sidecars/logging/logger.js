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
    service: 'project-service',
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
  fluentLogger = FluentLogger.createFluentSender('project-service', fluentConfig);
  
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
  
  // Funciones específicas de project
  project: {
    created: (projectId, userId) => {
      logger.info('New project created', {
        projectId,
        userId,
        event: 'project_created'
      });
    },
    
    updated: (projectId, userId) => {
      logger.info('Project updated', {
        projectId,
        userId,
        event: 'project_updated'
      });
    },
    
    deleted: (projectId, userId) => {
      logger.info('Project deleted', {
        projectId,
        userId,
        event: 'project_deleted'
      });
    },

    taskAdded: (projectId, taskId) => {
      logger.info('Task added to project', {
        projectId,
        taskId,
        event: 'task_added'
      });
    },

    taskCompleted: (projectId, taskId) => {
      logger.info('Task completed', {
        projectId,
        taskId,
        event: 'task_completed'
      });
    }
  }
};

module.exports = logger;