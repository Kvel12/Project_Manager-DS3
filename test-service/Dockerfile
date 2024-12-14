FROM node:18-alpine

WORKDIR /app

# Instalar netcat para healthcheck
RUN apk add --no-cache netcat-openbsd

# Copiar archivos de configuración
COPY package*.json ./
COPY jest.config.js ./
COPY wait-for-services.sh ./
RUN chmod +x wait-for-services.sh

# Instalar dependencias
RUN npm install

# Copiar código fuente y tests
COPY . .

# El comando por defecto espera a los servicios y luego ejecuta los tests
CMD ["./wait-for-services.sh"]