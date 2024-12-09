// api-gateway/src/routes/proxy.js
const express = require('express');
const { createProxyMiddleware } = require('http-proxy-middleware');
const config = require('../config');

const router = express.Router();

// Configuración de proxy para cada servicio
const createServiceProxy = (service) => {
  return createProxyMiddleware({
    target: config.services[service].url,
    changeOrigin: true,
    pathRewrite: {
      [`^/api/${service}`]: '',
    },
    onError: (err, req, res) => {
      logger.error(`Proxy error for ${service}:`, err);
      res.status(503).json({
        message: `${service} service temporarily unavailable`
      });
    }
  });
};

// Aplicar proxy a cada ruta de servicio
Object.keys(config.services).forEach(service => {
  router.use(`/api/${service}`, createServiceProxy(service));
});

module.exports = router;