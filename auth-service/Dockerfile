# Usar una imagen base de Node.js
FROM node:18-alpine

# Crear directorio de la aplicación
WORKDIR /usr/src/app

# Instalar dependencias del sistema
RUN apk add --no-cache \
    python3 \
    make \
    g++

# Copiar archivos de configuración
COPY package*.json ./

# Instalar dependencias
RUN npm install --production

# Copiar código fuente
COPY . .

# Crear directorio para logs
RUN mkdir -p logs && \
    chown -R node:node logs

# Variables de entorno
ENV NODE_ENV=production
ENV PORT=3001

# Cambiar a usuario no root
USER node

# Exponer puerto
EXPOSE 3001

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost:3001/auth/health || exit 1

# Comando para ejecutar la aplicación
CMD ["npm", "start"]