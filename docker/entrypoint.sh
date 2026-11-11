#!/bin/sh
set -e
envsubst '${PORT}' < /etc/nginx/templates/default.conf.template > /etc/nginx/conf.d/default.conf
exec supervisord -c /etc/supervisor/supervisord.conf
