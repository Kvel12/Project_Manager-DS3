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
# Cambiamos npm ci por npm install
RUN npm install --production

# Copiar código fuente y archivos de configuración
COPY . .

# Configurar permisos
RUN chown -R node:node /usr/src/app

# Variables de entorno por defecto
ENV NODE_ENV=production
ENV PORT=3002

# Cambiar a usuario no root
USER node

# Puerto por defecto
EXPOSE 3002

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3002/health || exit 1

ENTRYPOINT ["node", "src/index.js"]