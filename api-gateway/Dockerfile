# Multi-stage build
FROM node:18-alpine as builder  
WORKDIR /app  

# Instalar dependencias
COPY package*.json ./
RUN npm install --production  

# Copiar código fuente
COPY . .  

# Segunda etapa - imagen final
FROM nginx:alpine  

# Instalar Node.js y npm para el middleware
RUN apk add --update \     
    nodejs \
    npm \
    python3 \
    make \
    g++  

# Crear directorios necesarios
RUN mkdir -p /var/log/nginx && \
    mkdir -p /var/cache/nginx && \
    mkdir -p /app/logs && \
    chown -R nginx:nginx /var/cache/nginx && \
    chown -R nginx:nginx /var/log/nginx && \
    chown -R nginx:nginx /app/logs

# Copiar archivos de configuración de Nginx
COPY nginx/nginx.conf /etc/nginx/nginx.conf
COPY nginx/conf.d /etc/nginx/conf.d  

# Copiar aplicación Node.js desde el builder
COPY --from=builder /app /app
WORKDIR /app  

# Instalar dependencias de producción
RUN npm install --production  

# Configurar permisos
RUN chown -R nginx:nginx /etc/nginx/conf.d  

# Variables de entorno
ENV NODE_ENV=production 
ENV PORT=80  

# Exponer puerto
EXPOSE 80  

# Health check
HEALTHCHECK --interval=30s --timeout=3s \   
    CMD wget --no-verbose --tries=1 --spider http://localhost/health || exit 1  

# Copiar y configurar script de inicio
COPY docker-entrypoint.sh / 
RUN chmod +x /docker-entrypoint.sh  

ENTRYPOINT ["/docker-entrypoint.sh"]