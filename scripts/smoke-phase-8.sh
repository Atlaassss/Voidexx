#!/usr/bin/env bash
# Phase 8 smoke — share links, admin user detail, help widget, tour.
set +e
cd "$(dirname "$0")/.."
pkill -f "next-server" 2>/dev/null
sleep 1

nohup setsid npx next start --port 3000 >/tmp/next.log 2>&1 &
for i in $(seq 1 25); do grep -q "Ready in" /tmp/next.log 2>/dev/null && break; sleep 1; done
if ! curl -fsS -o /dev/null http://localhost:3000/ 2>/dev/null; then
  echo "[boot] FAIL"; tail -20 /tmp/next.log; exit 2
fi

echo "===================================================="
echo " Phase 8 smoke"
echo "===================================================="

probe() {
  local label="$1"; local url="$2"
  local code; code=$(curl -sS -o /tmp/body.html -w "%{http_code}" "$url")
  printf "  -> %-46s %s\n" "$label" "$code"
}
contains() {
  local label="$1"; local needle="$2"
  if grep -qF "$needle" /tmp/body.html; then
    printf "       %-46s OK\n" "contains: $label"
  else
    printf "       %-46s MISS\n" "contains: $label"
  fi
}

echo
echo "[1] New share-link page (unknown id → 404)"
probe "/share/UNKNOWN_ID"  http://localhost:3000/share/UNKNOWN_ID
echo

echo "[2] New admin user-detail page (demo)"
probe "/dashboard/admin/users/demo_user_kx"  http://localhost:3000/dashboard/admin/users/demo_user_kx
contains "user identity panel"   'Identity'
contains "plan switcher"         'OPERATOR'
contains "bonus grant section"   'Grant bonus'
contains "suspend cta"           'Suspend account'
contains "audit trail"           'Audit trail'
echo

echo "[3] Share API endpoint (demo → 503 with friendly body)"
code=$(curl -sS -o /tmp/body.html -w "%{http_code}" -X POST -H "content-type: application/json" \
       -d '{"enabled":true}' \
       http://localhost:3000/api/autopsy/ap_demo_1/share)
echo "       POST /api/autopsy/[id]/share → $code (expect 401 — auth)"
echo "       body: $(head -c 150 /tmp/body.html)"
echo

echo "[4] Admin user PATCH endpoint (demo → demo:true)"
code=$(curl -sS -o /tmp/body.html -w "%{http_code}" -X PATCH -H "content-type: application/json" \
       -d '{"grantBonus":5}' \
       http://localhost:3000/api/admin/users/demo_user_kx)
echo "       PATCH /api/admin/users/[id] (grantBonus:5) → $code"
echo "       body: $(head -c 200 /tmp/body.html)"
echo

echo "[5] Admin user GET endpoint (demo → demo:true)"
code=$(curl -sS -o /tmp/body.html -w "%{http_code}" \
       http://localhost:3000/api/admin/users/demo_user_kx)
echo "       GET /api/admin/users/[id] → $code"
echo "       body has 'demo': $(grep -c '\"demo\":true' /tmp/body.html)"
echo

echo "[6] Dashboard mounts HelpWidget + OnboardingTour"
probe "/dashboard"  http://localhost:3000/dashboard
contains "Help bubble button"      'aria-label="Open help"'
echo "       (OnboardingTour renders client-side after mount)"
echo

echo "[7] Upload page mounts ShareAutopsyButton"
probe "/dashboard/upload"  http://localhost:3000/dashboard/upload
echo "       (Share button only appears after a report is generated)"
echo

echo "[8] No regressions on existing routes"
probe "/"                       http://localhost:3000/
probe "/about"                  http://localhost:3000/about
probe "/dashboard/billing"      http://localhost:3000/dashboard/billing
probe "/dashboard/admin"        http://localhost:3000/dashboard/admin
probe "/blog"                   http://localhost:3000/blog
probe "/api/health"             http://localhost:3000/api/health
echo

echo "===================================================="
echo "Smoke test done. Killing server."
echo "===================================================="
pkill -f "next-server" 2>/dev/null
sleep 1
