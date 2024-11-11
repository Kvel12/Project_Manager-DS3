# Stage 1: Build Node.js application
FROM node:18-alpine as builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm ci --only=production

# Copiar código fuente
COPY . .

# Stage 2: Setup Nginx
FROM nginx:alpine

# Instalar Node.js y npm para el middleware
RUN apk add --update nodejs npm

# Copiar archivos de configuración de Nginx
COPY --from=builder /app/nginx/nginx.conf /etc/nginx/nginx.conf
COPY --from=builder /app/nginx/conf.d /etc/nginx/conf.d

# Crear directorio para la aplicación
WORKDIR /app

# Copiar aplicación Node.js
COPY --from=builder /app /app

# Instalar dependencias de producción
RUN npm ci --only=production

# Crear directorios necesarios
RUN mkdir -p /var/log/nginx
RUN mkdir -p /var/cache/nginx

# Permisos para Nginx
RUN chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Configurar variables de entorno
ENV NODE_ENV=production
ENV JWT_SECRET=your-secret-key
ENV REDIS_HOST=redis
ENV REDIS_PORT=6379

# Exponer puerto
EXPOSE 80

# Script de inicio
COPY docker-entrypoint.sh /
RUN chmod +x /docker-entrypoint.sh

# Health check
HEALTHCHECK --interval=30s --timeout=3s \
  CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]