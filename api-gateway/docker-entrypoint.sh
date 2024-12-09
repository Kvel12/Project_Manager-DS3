#!/bin/sh

echo "Waiting for services to be ready..."

# Función para verificar servicio
check_service() {
    local service=$1
    local port=$2
    echo "Checking $service on port $port..."
    for i in $(seq 1 30); do
        wget -q --spider http://$service:$port/health && return 0
        echo "$service is not ready. Attempt $i/30"
        sleep 2
    done
    return 1
}

# Verificar servicios
check_service auth-service 3001 || exit 1
echo "Auth service is ready"

# Verificar configuración de nginx
echo "Checking Nginx configuration..."
nginx -t || exit 1

# Iniciar Nginx
echo "Starting Nginx..."
exec nginx -g 'daemon off;'