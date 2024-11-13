#!/bin/sh

# Esperar por los servicios
echo "Waiting for Auth Service..."
while ! wget -q --spider http://auth-service:3001/health; do
    echo "Auth Service is unavailable - sleeping"
    sleep 1
done

echo "Waiting for Project Service..."
while ! wget -q --spider http://project-service:3002/health; do
    echo "Project Service is unavailable - sleeping"
    sleep 1
done

echo "Waiting for Payment Service..."
while ! wget -q --spider http://payment-service:3003/health; do
    echo "Payment Service is unavailable - sleeping"
    sleep 1
done

echo "All services are up - starting nginx"

# Verificar la configuración de nginx
nginx -t

# Iniciar nginx
exec nginx -g 'daemon off;'