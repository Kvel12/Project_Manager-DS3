// payment-service/src/middleware/validationMiddleware.js
const logger = require('../sidecars/logging/logger');

const validationMiddleware = {
  body: (schema) => (req, res, next) => {
    const errors = [];

    Object.keys(schema).forEach(field => {
      const value = req.body[field];
      const rules = schema[field];

      // Validación requerida
      if (rules.required && (value === undefined || value === null)) {
        errors.push(`${field} is required`);
        return;
      }

      if (value !== undefined && value !== null) {
        // Validación de tipo
        if (rules.type === 'number' && typeof value !== 'number') {
          errors.push(`${field} must be a number`);
        }

        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }

        // Validación de valor mínimo para números
        if (rules.type === 'number' && rules.min !== undefined && value < rules.min) {
          errors.push(`${field} must be at least ${rules.min}`);
        }

        // Validación de enum
        if (rules.enum && !rules.enum.includes(value)) {
          errors.push(`${field} must be one of: ${rules.enum.join(', ')}`);
        }
      }
    });

    if (errors.length > 0) {
      logger.warn('Validation errors:', { errors, body: req.body });
      return res.status(400).json({ errors });
    }

    next();
  }
};

module.exports = validationMiddleware;