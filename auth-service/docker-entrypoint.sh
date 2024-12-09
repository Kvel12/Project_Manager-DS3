#!/bin/sh
# docker-entrypoint.sh

# Esperar por la base de datos
echo "Waiting for database..."
while ! pg_isready -h $DB_HOST -p $DB_PORT -U $DB_USER; do
  echo "Database is unavailable - sleeping"
  sleep 2
done

echo "Database is up - starting application"

# Iniciar la aplicación
exec npm start