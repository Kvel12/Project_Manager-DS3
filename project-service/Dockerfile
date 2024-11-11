# project-service/Dockerfile
FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Instalar dependencias del sistema
RUN apk add --no-cache python3 make g++

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3002

# Crear directorio para logs
RUN mkdir -p logs && \
    chown -R node:node logs

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
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

# Comando de inicio con espera a la base de datos
CMD ["node", "src/index.js"]