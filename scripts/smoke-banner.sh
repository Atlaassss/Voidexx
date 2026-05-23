#!/usr/bin/env bash
# Verify both demo-banner modes:
#   1. default (no env flag): banner DOES render, has dismiss button
#   2. NEXT_PUBLIC_HIDE_DEMO_BANNER=1: banner does NOT render
set +e
cd "$(dirname "$0")/.."
pkill -f "next-server" 2>/dev/null
sleep 1

run_case() {
  local label="$1"; shift
  local env_str="$1"; shift
  echo
  echo "========================================================"
  echo " CASE: $label"
  echo "   env: ${env_str:-<none>}"
  echo "========================================================"

  pkill -f "next-server" 2>/dev/null; sleep 1
  rm -rf .next 2>/dev/null
  env $env_str npx next build > /tmp/build.log 2>&1
  if ! grep -q "✓ Compiled successfully" /tmp/build.log; then
    echo "BUILD FAIL — see /tmp/build.log"
    tail -20 /tmp/build.log
    return 1
  fi
  nohup setsid env $env_str npx next start --port 3000 > /tmp/next.log 2>&1 &
  for i in $(seq 1 20); do
    grep -q "Ready in" /tmp/next.log 2>/dev/null && break
    sleep 1
  done
  curl -fsS http://localhost:3000/ > /tmp/home.html 2>/dev/null
  echo " -> /  HTTP $(curl -sS -o /dev/null -w '%{http_code}' http://localhost:3000/)"

  if grep -q 'aria-label="Dismiss demo banner' /tmp/home.html; then
    echo "    BANNER PRESENT  (dismiss × found)"
  else
    echo "    banner not present"
  fi
  if grep -q 'README · launch checklist' /tmp/home.html; then
    echo "    new copy 'README · launch checklist' rendered"
  fi
  if grep -q 'set env vars in' /tmp/home.html; then
    echo "    OLD COPY STILL THERE (regression!)"
  fi
  if grep -q 'NEXT_PUBLIC_HIDE_DEMO_BANNER' /tmp/home.html; then
    echo "    LEAK: env var name appears in client HTML!"
  fi
  pkill -f "next-server" 2>/dev/null
  sleep 1
}

run_case "default — banner SHOULD render with × dismiss" ""
run_case "NEXT_PUBLIC_HIDE_DEMO_BANNER=1 — banner SHOULD be gone" "NEXT_PUBLIC_HIDE_DEMO_BANNER=1"

echo
echo "========================================================"
echo " done"
echo "========================================================"
