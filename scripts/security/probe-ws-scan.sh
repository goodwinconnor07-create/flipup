#!/bin/sh
# Regression check (local worker only): scanning for tables through the socket route must be rate limited like GET /api/tables/:code.
# Needs a fresh `wrangler dev` (the counter lives in the worker's memory). Expects 40x 404 then 429s.
B=${1:-127.0.0.1:8799}
case "$B" in 127.0.0.1*|localhost*) ;; *) echo "local only"; exit 2;; esac
for i in $(seq 1 60); do curl -s -o /dev/null -w "%{http_code}\n" -H 'Upgrade: websocket' -H 'Connection: Upgrade' -H 'Sec-WebSocket-Key: dGhlIHNhbXBsZSBub25jZQ==' -H 'Sec-WebSocket-Version: 13' "$B/api/tables/FOLD$((i%10))$((i/10))/ws?device=abcdefgh12"; done | sort | uniq -c
