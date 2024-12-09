#!/bin/bash

# Configuración
TOKEN="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJ1c2VySWQiOjEsInJvbGUiOiJ1c2VyIiwiaWF0IjoxNzMxODE0NjA1LCJleHAiOjE3MzE4MTgyMDV9.88GFg4eybshvwPECAdYvF_3bFpqsxbufNRTT-8JnALM"
API_URL="http://localhost/api/projects"
NUM_REQUESTS=20
CONCURRENT_REQUESTS=3  # Número de peticiones concurrentes

# Colores para la salida
RED='\033[0;31m'
GREEN='\033[0;32m'
NC='\033[0m'

# Función para hacer la petición
make_request() {
    local id=$1
    response=$(curl -s -w "\n%{http_code}" -X POST $API_URL \
        -H "Content-Type: application/json" \
        -H "Authorization: Bearer $TOKEN" \
        -d '{
            "title": "Circuit Breaker Test",
            "description": "Testing Circuit Breaker",
            "priority": "high",
            "budget": 1000,
            "forceTimeout": true
        }' --max-time 1)  # Timeout de 1 segundo para forzar fallos

    http_code=$(echo "$response" | tail -n1)
    body=$(echo "$response" | sed '$d')

    echo -e "${GREEN}Request $id - Status:${NC} $http_code"
    echo -e "${GREEN}Response:${NC} $body"
}

echo "Iniciando prueba de Circuit Breaker..."
echo "Enviando peticiones concurrentes..."

# Ejecutar peticiones concurrentes
for ((i=1; i<=$NUM_REQUESTS; i++)); do
    for ((j=1; j<=$CONCURRENT_REQUESTS; j++)); do
        make_request "$i-$j" &
    done
    sleep 0.5  # Pequeña pausa entre grupos de peticiones concurrentes
    wait
done

echo "Prueba completada."