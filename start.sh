#!/bin/sh
set -eu
python3 /usr/local/bin/share_gateway.py &
exec nginx -g 'daemon off;'
