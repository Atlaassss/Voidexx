#!/usr/bin/env bash
set +e
cd "$(dirname "$0")/.."
pkill -f "next-server" 2>/dev/null
sleep 1
nohup setsid npx next start --port 3000 >/tmp/next.log 2>&1 &
for i in $(seq 1 25); do grep -q "Ready in" /tmp/next.log 2>/dev/null && break; sleep 1; done
curl -fsS http://localhost:3000/ > /tmp/home.html
echo "--- propflow / tradenomics anchors:"
grep -oE 'href="[^"]*\.example[^"]*"' /tmp/home.html
echo "--- all rel attrs:"
grep -oE 'rel="[^"]+"' /tmp/home.html | sort -u
echo "--- 'sponsored' substring count:"
grep -c sponsored /tmp/home.html
pkill -f "next-server" 2>/dev/null
