# Auth Service Dockerfile
FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Instalar dependencias necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++ \
    postgresql-client

# Crear directorio para logs
RUN mkdir -p logs

# Copiar archivos de configuración
COPY package*.json ./
RUN npm install --production

# Copiar código fuente y script de entrada
COPY . .
COPY docker-entrypoint.sh /usr/src/app/

# Configurar permisos (antes de cambiar al usuario node)
RUN chmod +x /usr/src/app/docker-entrypoint.sh && \
    chown -R node:node /usr/src/app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3001

# Cambiar a usuario no root
USER node

# Puerto por defecto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/health || exit 1

ENTRYPOINT ["/usr/src/app/docker-entrypoint.sh"]