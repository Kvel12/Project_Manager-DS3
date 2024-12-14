#!/bin/sh
chmod -R 777 /fluentd/log
fluentd -c /fluentd/etc/fluent.conf & node src/index.js