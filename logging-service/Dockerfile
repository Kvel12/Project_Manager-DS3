FROM fluent/fluentd:v1.16.3-1.0

USER root

# Install dependencies
RUN apk add --no-cache \
    sudo \
    nodejs \
    npm \
    netcat-openbsd

# Install Fluentd plugins
RUN fluent-gem install \
    fluent-plugin-elasticsearch \
    fluent-plugin-rewrite-tag-filter

# Create directories and set permissions
RUN mkdir -p /fluentd/log/buffer/auth && \
    mkdir -p /fluentd/log/buffer/project && \
    mkdir -p /fluentd/log/buffer/payment && \
    mkdir -p /fluentd/log/buffer/gateway && \
    mkdir -p /fluentd/log/buffer/other && \
    chmod -R 777 /fluentd/log && \
    chown -R fluent:fluent /fluentd/log

WORKDIR /app
COPY package*.json ./
RUN npm install

COPY . .
COPY fluent.conf /fluentd/etc/
COPY start.sh /start.sh

RUN chmod +x /start.sh

EXPOSE 3005 24224

CMD ["/start.sh"]