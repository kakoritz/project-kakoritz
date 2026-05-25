#!/usr/bin/env bash
# Post-deploy API health checks — run from the self-hosted runner (local LAN access to NAS)
# Exit 1 if any critical check fails.

API="http://192.168.1.251:8586"
DASH="http://192.168.1.251:8585"
PASS=0
FAIL=0
WARN=0

ok()   { echo "  ✅ PASS: $1"; ((PASS++)); }
fail() { echo "  ❌ FAIL: $1"; echo "     Got: $(echo "$2" | head -c 300)"; ((FAIL++)); }
warn() { echo "  ⚠️  WARN: $1"; ((WARN++)); }

# Wait for the API to be ready (up to 30 seconds)
echo "⏳ Waiting for dashboard-api to be ready..."
for i in $(seq 1 15); do
  if curl -sf "$API/health" >/dev/null 2>&1; then break; fi
  sleep 2
done

echo ""
echo "═══════════════════════════════════════════"
echo "  KAKORITZ Dashboard — API Health Checks"
echo "═══════════════════════════════════════════"
echo ""

# ── dashboard-api (port 8586) ────────────────────────────────────────────────

echo "📦 dashboard-api ($API)"

R=$(curl -sf "$API/health" 2>/dev/null)
if echo "$R" | grep -q '"status":"ok"'; then
  ok "GET /health"
else
  fail "GET /health" "$R"
fi

R=$(curl -sf "$API/api/tasks" 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list)" 2>/dev/null; then
  ok "GET /api/tasks → array"
else
  fail "GET /api/tasks" "$R"
fi

R=$(curl -sf "$API/api/categories" 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list) and len(d)>0" 2>/dev/null; then
  ok "GET /api/categories → non-empty array"
else
  fail "GET /api/categories" "$R"
fi

R=$(curl -sf "$API/api/photos" 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list)" 2>/dev/null; then
  ok "GET /api/photos → array"
else
  fail "GET /api/photos" "$R"
fi

# ── EarthMC proxies (all go through NAS → api.earthmc.net) ──────────────────

echo ""
echo "🌍 EarthMC proxies (via $API)"

R=$(curl -sf -X POST "$API/api/earthmc/players" \
  -H "Content-Type: application/json" \
  -d '{"query":["kakoritz"]}' 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert any(p.get('name','').lower()=='kakoritz' for p in d)" 2>/dev/null; then
  ok "POST /api/earthmc/players → kakoritz found"
else
  fail "POST /api/earthmc/players" "$R"
fi

R=$(curl -sf -X POST "$API/api/earthmc/nations" \
  -H "Content-Type: application/json" \
  -d '{"query":["Narmada"]}' 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert any(n.get('name','').lower()=='narmada' for n in d)" 2>/dev/null; then
  ok "POST /api/earthmc/nations → Narmada found"
else
  fail "POST /api/earthmc/nations" "$R"
fi

R=$(curl -sf -X POST "$API/api/earthmc/towns" \
  -H "Content-Type: application/json" \
  -d '{"query":["Sita"]}' 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert isinstance(d,list) and len(d)>0" 2>/dev/null; then
  ok "POST /api/earthmc/towns → Sita found"
else
  fail "POST /api/earthmc/towns" "$R"
fi

# Shop: key required. Accept: shops array OR rate-limit (429/retryAfter).
# Reject: "EARTHMC_API_KEY not configured" or "Could not find an owner".
R=$(curl -sf -X POST "$API/api/earthmc/shop" \
  -H "Content-Type: application/json" \
  -d '{"query":["5964140b-a902-48f6-832a-a385c0e17145"]}' 2>/dev/null)
if echo "$R" | python3 -c "import sys,json; d=json.load(sys.stdin); assert 'shops' in d or 'retryAfter' in d" 2>/dev/null; then
  if echo "$R" | grep -q '"_cached"'; then
    ok "POST /api/earthmc/shop → cached shops served"
  elif echo "$R" | grep -q '"retryAfter"'; then
    warn "POST /api/earthmc/shop → rate-limited (expected after deploy), serving cached"
  else
    ok "POST /api/earthmc/shop → shops returned"
  fi
elif echo "$R" | grep -qi "not configured"; then
  fail "POST /api/earthmc/shop — EARTHMC_API_KEY missing in container" "$R"
elif echo "$R" | grep -qi "could not find an owner"; then
  fail "POST /api/earthmc/shop — API key not accepted (wrong auth format?)" "$R"
else
  warn "POST /api/earthmc/shop — unexpected response (check manually)" && echo "     Got: $(echo "$R" | head -c 200)"
fi

# ── Dashboard (port 8585) ───────────────────────────────────────────────────

echo ""
echo "🖥️  Dashboard ($DASH)"

R=$(curl -sf "$DASH/" 2>/dev/null)
if echo "$R" | grep -qi "kakoritz\|<!doctype html"; then
  ok "GET / → HTML served"
else
  fail "GET / (dashboard)" "$R"
fi

# ── Summary ──────────────────────────────────────────────────────────────────

echo ""
echo "═══════════════════════════════════════════"
printf "  Results: %d passed  %d warned  %d failed\n" "$PASS" "$WARN" "$FAIL"
echo "═══════════════════════════════════════════"

if [ "$FAIL" -gt 0 ]; then
  echo "  ❌ Health check FAILED — $FAIL critical issue(s)"
  exit 1
fi
echo "  ✅ Health check PASSED"
exit 0
