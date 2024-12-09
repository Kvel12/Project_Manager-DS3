# Multi-stage build
FROM node:18-alpine as builder

WORKDIR /app

# Instalar dependencias
COPY package*.json ./
RUN npm install --production

# Copiar código fuente
COPY . .

# Segunda etapa
FROM nginx:alpine

# Instalar Node.js y dependencias necesarias
RUN apk add --update \
    nodejs \
    npm \
    curl \
    wget

# Crear directorios necesarios
WORKDIR /app

# Copiar la aplicación Node.js del builder
COPY --from=builder /app /app

# Copiar configuraciones de nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Crear directorio para logs y configurar permisos
RUN mkdir -p /var/log/nginx && \
    mkdir -p /var/cache/nginx && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /etc/nginx/conf.d

# Exponer puerto
EXPOSE 80

# Copiar y configurar script de inicio
COPY docker-entrypoint.sh /docker-entrypoint.sh
RUN chmod +x /docker-entrypoint.sh

# Health check más ligero
HEALTHCHECK --interval=30s --timeout=3s \
    CMD wget -q -O - http://localhost/health || exit 1

ENTRYPOINT ["/docker-entrypoint.sh"]