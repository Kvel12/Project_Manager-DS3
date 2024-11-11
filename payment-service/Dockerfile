FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Instalar dependencias necesarias
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Crear directorio para logs
RUN mkdir -p logs

# Copiar archivos de configuración
COPY package*.json ./
RUN npm install --production

# Copiar código fuente
COPY . .

# Configurar permisos (antes de cambiar al usuario node)
RUN chown -R node:node /usr/src/app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3003

# Cambiar a usuario no root
USER node

# Puerto por defecto
EXPOSE 3003

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3003/health || exit 1

ENTRYPOINT ["node", "src/index.js"]