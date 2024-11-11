#!/bin/sh
# docker-entrypoint.sh

# Esperar por servicios dependientes
echo "Waiting for Redis..."
while ! nc -z ${REDIS_HOST:-redis} ${REDIS_PORT:-6379}; do
  echo "Redis is unavailable - sleeping"
  sleep 1
done

echo "Waiting for Auth Service..."
while ! nc -z ${AUTH_SERVICE_HOST:-auth-service} ${AUTH_SERVICE_PORT:-3001}; do
  echo "Auth Service is unavailable - sleeping"
  sleep 1
done

# Iniciar Node.js middleware
echo "Starting Node.js middleware..."
node /app/src/index.js &

# Iniciar Nginx
echo "Starting Nginx..."
nginx -g 'daemon off;'