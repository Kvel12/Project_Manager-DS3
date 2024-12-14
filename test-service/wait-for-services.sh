#!/bin/sh

# Función para esperar por un servicio
wait_for_service() {
    service_host=$1
    service_port=$2
    service_name=$3
    
    echo "Esperando a que $service_name esté disponible en $service_host:$service_port..."
    
    while ! nc -z $service_host $service_port; do
        echo "Esperando a $service_name..."
        sleep 2
    done
    
    echo "$service_name está disponible!"
}

# Esperar por cada servicio
wait_for_service auth-service 3001 "Auth Service"
wait_for_service project-service 3002 "Project Service"
wait_for_service payment-service 3003 "Payment Service"
wait_for_service api-gateway 80 "API Gateway"

echo "Todos los servicios están disponibles. Ejecutando tests..."
npm test