// auth-service/src/middleware/validationMiddleware.js
const logger = require('../sidecars/logging/logger');

const validationMiddleware = {
  validateBody: (schema) => (req, res, next) => {
    const errors = [];

    Object.keys(schema).forEach(field => {
      const value = req.body[field];
      const rules = schema[field];

      if (rules.required && !value) {
        errors.push(`${field} is required`);
        return;
      }

      if (value) {
        // Validación de tipo string
        if (rules.type === 'string' && typeof value !== 'string') {
          errors.push(`${field} must be a string`);
        }

        // Validación de longitud mínima
        if (rules.min && value.length < rules.min) {
          errors.push(`${field} must be at least ${rules.min} characters`);
        }

        // Validación de longitud máxima
        if (rules.max && value.length > rules.max) {
          errors.push(`${field} must be at most ${rules.max} characters`);
        }

        // Validación de patrón
        if (rules.pattern && !new RegExp(rules.pattern).test(value)) {
          errors.push(`${field} contains invalid characters`);
        }

        // Validación de email
        if (rules.email && !value.includes('@')) {
          errors.push(`${field} must be a valid email`);
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