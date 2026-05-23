#!/usr/bin/env bash
# Phase 7.2 smoke-test runner. Boots `next start`, waits for ready, runs HTTP
# probes against every fixed surface, then kills the server. Single
# self-contained script — no dependency on long-lived background processes.

set +e
cd "$(dirname "$0")/.."

# Ensure no stale server from earlier attempts.
pkill -f "next-server" 2>/dev/null
sleep 1

# Boot in setsid so the child outlives the agent's shell tree.
nohup setsid npx next start --port 3000 >/tmp/next.log 2>&1 &
echo "[boot] pid=$!"

# Wait up to 25s for "Ready" line.
for i in $(seq 1 25); do
  if grep -q "Ready in" /tmp/next.log 2>/dev/null; then
    echo "[boot] ready after ${i}s"
    break
  fi
  sleep 1
done

if ! curl -fsS -o /dev/null http://localhost:3000/ 2>/dev/null; then
  echo "[boot] FAIL — server not responding on :3000"
  echo "----- last 20 lines of /tmp/next.log -----"
  tail -20 /tmp/next.log
  pkill -f "next-server" 2>/dev/null
  exit 2
fi

echo
echo "===================================================="
echo "Phase 7.2 smoke test — every fix from the audit"
echo "===================================================="
echo

probe() {
  local label="$1"
  local url="$2"
  local code
  code=$(curl -sS -o /tmp/body.html -w "%{http_code}" "$url")
  printf "  -> %-44s %s\n" "$label" "$code"
}

assert_in_body() {
  local label="$1"
  local needle="$2"
  if grep -qF "$needle" /tmp/body.html; then
    printf "       %-44s OK\n" "contains: $label"
  else
    printf "       %-44s MISS (\"$needle\")\n" "contains: $label"
  fi
}

# ---------------------------------------------------------------
# 1. Stub pages
# ---------------------------------------------------------------
echo "[1] Stub pages (Footer was href=\"#\" before this PR)"
probe "/about"           http://localhost:3000/about
probe "/careers"         http://localhost:3000/careers
probe "/changelog"       http://localhost:3000/changelog
probe "/contact"         http://localhost:3000/contact
probe "/press"           http://localhost:3000/press
probe "/roadmap"         http://localhost:3000/roadmap
probe "/legal/terms"     http://localhost:3000/legal/terms
probe "/legal/privacy"   http://localhost:3000/legal/privacy
probe "/legal/security"  http://localhost:3000/legal/security
probe "/legal/dpa"       http://localhost:3000/legal/dpa
echo

# ---------------------------------------------------------------
# 2. Footer points at the new stubs (not href="#")
# ---------------------------------------------------------------
echo "[2] Footer no longer ships href=\"#\" links"
curl -sS -o /tmp/home.html http://localhost:3000/
hash_total=$(grep -oE 'href="[^"]+"' /tmp/home.html | grep -c 'href="#"$')
echo "       href=\"#\" occurrences in /            : ${hash_total:-0} (expect 0)"
for stub in /about /careers /changelog /contact /press /roadmap /legal/terms /legal/privacy /legal/security /legal/dpa; do
  if grep -qF "href=\"$stub\"" /tmp/home.html; then
    printf "       footer link present: %-30s OK\n" "$stub"
  else
    printf "       footer link present: %-30s MISS\n" "$stub"
  fi
done
echo

# ---------------------------------------------------------------
# 3. Settings page — toggles + actions exist as real elements
# ---------------------------------------------------------------
echo "[3] Settings page — real <button role=\"switch\"> + actions"
probe "/dashboard/settings" http://localhost:3000/dashboard/settings
assert_in_body "Daily AI insight email"  'Daily AI insight email'
assert_in_body "role=\"switch\""           'role="switch"'
assert_in_body "aria-checked"              'aria-checked'
assert_in_body "Export data btn"           'Export data'
assert_in_body "Purge account btn"         'Purge account'
echo

# ---------------------------------------------------------------
# 4. Topbar bell + ⌘K trigger
# ---------------------------------------------------------------
echo "[4] Topbar — bell + command palette trigger"
curl -sS -o /tmp/dash.html http://localhost:3000/dashboard
assert_in_body "Bell aria-label"           'aria-label="Notifications'
assert_in_body "Command palette button"    'aria-label="Open command palette"'
assert_in_body "⌘ K hint chip"             '⌘ K'
echo

# ---------------------------------------------------------------
# 5. Journal — search input + filter buttons real
# ---------------------------------------------------------------
echo "[5] Journal — search input + Filters/Tags wired"
probe "/dashboard/journal" http://localhost:3000/dashboard/journal
assert_in_body "Search input"  'placeholder="Search trades, tags, notes ...'
assert_in_body "Filters btn"   'Filters'
assert_in_body "Tags btn"      'Tags'
assert_in_body "showing/of footer" 'showing'
echo

# ---------------------------------------------------------------
# 6. Learn — disabled CTA with explanatory chip
# ---------------------------------------------------------------
echo "[6] Learn — Start a session disabled with Phase 8 chip"
probe "/dashboard/learn" http://localhost:3000/dashboard/learn
assert_in_body "Phase 8 chip"  'Phase 8 · needs OPENAI_API_KEY'
echo

# ---------------------------------------------------------------
# 7. AdRail — anchor tags with rel=sponsored
# ---------------------------------------------------------------
echo "[7] AdRail — sponsored CTAs are anchors"
curl -sS -o /tmp/home.html http://localhost:3000/
assert_in_body "rel=sponsored on /"  'rel="noopener nofollow sponsored"'
echo

# ---------------------------------------------------------------
# 8. TerminalCard tabs
# ---------------------------------------------------------------
echo "[8] TerminalCard — 3 tab buttons with aria-pressed"
chart_count=$(grep -o 'aria-pressed' /tmp/home.html | wc -l)
echo "       aria-pressed count on /            : $chart_count (expect 3)"
echo

# ---------------------------------------------------------------
# 9. Automation page + Connect button
# ---------------------------------------------------------------
echo "[9] Automation page renders + Connect BingX button"
probe "/dashboard/automation" http://localhost:3000/dashboard/automation
assert_in_body "Connect BingX btn" 'Connect BingX'
echo

# ---------------------------------------------------------------
# 10. Admin + Costs render
# ---------------------------------------------------------------
echo "[10] Admin + Costs render"
probe "/dashboard/admin"        http://localhost:3000/dashboard/admin
probe "/dashboard/admin/costs"  http://localhost:3000/dashboard/admin/costs
echo

# ---------------------------------------------------------------
# 11. Critical existing routes still 200 (no regressions)
# ---------------------------------------------------------------
echo "[11] No regressions on existing routes"
probe "/"                       http://localhost:3000/
probe "/dashboard"              http://localhost:3000/dashboard
probe "/dashboard/billing"      http://localhost:3000/dashboard/billing
probe "/dashboard/upload"       http://localhost:3000/dashboard/upload
probe "/dashboard/referrals"    http://localhost:3000/dashboard/referrals
probe "/blog"                   http://localhost:3000/blog
probe "/blog/four-trader-archetypes"  http://localhost:3000/blog/four-trader-archetypes
probe "/api/health"             http://localhost:3000/api/health
echo

# ---------------------------------------------------------------
# 12. API behaviour probes
# ---------------------------------------------------------------
echo "[12] API probes (should NOT 500 in demo mode)"
code=$(curl -sS -o /tmp/body.html -w "%{http_code}" -X POST -H "content-type: application/json" \
       -d '{"plan":"OPERATOR","provider":"paymongo","method":"gcash"}' \
       http://localhost:3000/api/billing/checkout)
echo "       POST /api/billing/checkout (paymongo)   -> $code  (expect 503)"
echo "         body: $(cat /tmp/body.html | head -c 220)"
echo

code=$(curl -sS -o /tmp/body.html -w "%{http_code}" -X DELETE \
       http://localhost:3000/api/exchange/demo_bingx)
echo "       DELETE /api/exchange/demo_bingx          -> $code"
echo "         body: $(cat /tmp/body.html | head -c 220)"
echo

code=$(curl -sS -o /tmp/body.html -w "%{http_code}" \
       http://localhost:3000/api/admin/stats)
echo "       GET /api/admin/stats                     -> $code"
echo "         body: $(cat /tmp/body.html | head -c 220)"
echo

# ---------------------------------------------------------------
echo "===================================================="
echo "Smoke test complete. Killing server."
echo "===================================================="
pkill -f "next-server" 2>/dev/null
sleep 1
echo "Server stopped."
