// project-service/src/middleware/validationMiddleware.js
const logger = require('../sidecars/logging/logger');

const validationMiddleware = {
  body: (schema) => (req, res, next) => {
    const errors = [];

    Object.keys(schema).forEach(field => {
      const value = req.body[field];
      const rules = schema[field];

      if (rules.required && !value) {
        errors.push(`${field} is required`);
        return;
      }

      if (value) {
        if (rules.type === 'string' && rules.min && value.length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters`);
        }

        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }

        if (rules.type === 'number' && rules.min && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }

        if (rules.type === 'date' && isNaN(Date.parse(value))) {
          errors.push(`${field} must be a valid date`);
        }
      }
    });

    if (errors.length > 0) {
      logger.warn('Validation errors:', { errors });
      return res.status(400).json({ errors });
    }

    next();
  }
};

module.exports = validationMiddleware;