# payment-service/Dockerfile
FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

# Crear directorio para logs
RUN mkdir -p logs && \
    chown -R node:node logs

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3003

# Copiar archivos de configuración
COPY package*.json ./
COPY .env ./.env

# Instalar dependencias
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Cambiar a usuario no root
USER node

# Exponer puerto
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

# Comando de inicio
CMD ["node", "src/index.js"]