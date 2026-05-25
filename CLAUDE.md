# KAKORITZ Dashboard — CLAUDE.md

## What this is
A personal home lab dashboard built with React + TypeScript + Vite + MUI (Material UI v9). It runs inside Docker on a Synology NAS (`spiker-nas-1`, `192.168.1.251`) and is accessible on the local network at port 8585. A companion Node/Express photo API runs on the same NAS at port 8586.

## Deploy pipeline
Push to `main` → GitHub Actions runs these jobs:

1. **`build-and-push`** (GitHub-hosted runner): builds the React app into a Docker image, pushes to `ghcr.io/kakoritz/project-kakoritz:latest`.
2. **`build-api`** (self-hosted runner `kakoritz-laptop`): builds `./api` (Node/Express), SSHes image to NAS, restarts `dashboard-api` container on port 8586.
3. **`build-claude-api`** (self-hosted runner): builds `./claude-api`, SSHes image to NAS, restarts `claude-api` container on port 8587.
4. **`deploy-dashboard`** (self-hosted runner, depends on `build-and-push`): SSHs into NAS, pulls new image, restarts `project-kakoritz` container on port 8585. Runs `tests/health-check.sh` afterward.

NAS SSH user: `aspiker` at `192.168.1.251`. Docker binary on NAS: `/var/packages/ContainerManager/target/usr/bin/docker`.

Workflow file: [.github/workflows/deploy.yml](.github/workflows/deploy.yml)

## How to push a change
```bash
git add <files>
git commit -m "your message"
git push origin main
```
That's it — GitHub Actions handles the rest.

## Local dev
```bash
npm install
npm run dev        # Vite dev server (hot reload)
npm run build      # TypeScript + Vite prod build → dist/
```

## Project structure
```
src/
  App.tsx           # Root: MUI ThemeProvider, side nav, page router
  pages/
    Overview.tsx    # Landing: stat cards (static), live clock
    Weather.tsx     # Live weather via open-meteo API; 5-day forecast, 24h modal drill-in
    WeatherScene.tsx # Animated weather scene components (sun/moon/rain/snow/storm) + getWeatherBg()
    LabMonitor.tsx  # Gauge cards for CPU/GPU/RAM/disk (static placeholders — needs NAS API)
    Analytics.tsx   # Network traffic area chart + storage bar chart (random mock data)
    Portal.tsx      # App portal: Lab tools (DSM, AdGuard, Plex, Router, VPN), Finance, Integrations. Accepts `onNavigate` prop to deep-link to other pages.
    Gallery.tsx     # Family photo gallery — category cards → drill-in with lightbox
    EarthMC.tsx     # EarthMC game monitor — shop dashboard, live SSE feed, nation overview
    Etsy.tsx        # Etsy shop stub — Orders + Messages tabs (OAuth pending approval, no live calls yet)

api/
  server.js         # Express API: photos, tasks (JSON file), EarthMC proxy endpoints, Etsy proxy stubs
  Dockerfile        # Node 20-alpine image (NOT 24 — better-sqlite3 requires node:20), port 3001 → NAS 8586

tests/
  health-check.sh   # Post-deploy smoke tests: all endpoints pass/fail, used in CI

Dockerfile          # Multi-stage: node build → nginx:alpine, port 80 → NAS 8585
nginx.conf          # SPA fallback: try_files → index.html
```

## Tech stack
- **React 19** + **TypeScript 6** + **Vite 8**
- **MUI v9** (`@mui/material`, `@mui/icons-material`) — dark theme, indigo primary (#6366f1)
- **lucide-react** — icon library used in Weather, Gallery
- **recharts** — charts in Analytics
- **axios** — installed but not yet used (fetch is used directly)
- **open-meteo** — free weather API, no key required; location hardcoded to Rutherfordton NC (35.37, -81.96)

## Key constants / IPs
| Thing | Value |
|---|---|
| NAS IP | 192.168.1.251 |
| Dashboard port (NAS) | 8585 |
| Photo API port (NAS) | 8586 |
| Photo API base (Gallery.tsx) | `http://192.168.1.251:8586` |
| Weather location | Rutherfordton, NC (lat 35.37, lon -81.96) |
| Photo root (NAS volume) | `/volume1/Data/Pictures/FAMILY` |
| Docker image | `ghcr.io/kakoritz/project-kakoritz:latest` |
| EarthMC API base | `https://api.earthmc.net/v4` |
| EarthMC player | `kakoritz` |
| EarthMC nation | `Narmada` |
| EarthMC shop town | `Sita` (the mega shop) |

## EarthMC page (EarthMC.tsx)
Monitors the Narmada nation's mega shop in the town of Sita on the EarthMC Minecraft server.

**Three tabs:**
- **Shops** — fetches all barrels owned by `kakoritz` via `POST /shop`, displays stock level (red=out, amber<64, green≥64), price, per-unit price. **Auto-refresh is OFF by default** (toggle to enable; fires once per 5-min cache window). Manual refresh button disabled while rate-limited. Status bar shows countdown + traffic-light dot. Sorted worst-stock-first.
- **Live Feed** — SSE stream (`GET /events`). **Off by default** — user must toggle on. Shows real-time sales, purchases, out-of-stock/space/gold alerts. Sales are also recorded to SQLite by the server-side recorder (runs 24/7 even with no browser open).
- **Nation** — Narmada balance, king, capital, residents (green dot = online), allies, enemies. Town cards grid (all 52 towns), clickable for detail popup. Clicking residents opens player info popup.

**API:** `https://api.earthmc.net/v4` — read-only. No way to write/push data to shop barrels.

**Auth:** API key stored as GitHub Secret `VITE_EARTHMC_API_KEY`. The key is passed at runtime as `EARTHMC_API_KEY` env var to the `dashboard-api` container (NOT baked into the frontend). Also used for SSE events.

In-game key commands: `/api key create`, `/api key delete`, `/api key copy`

**MUI v9 gotcha:** ALL CSS/layout props must go inside `sx={}`. Direct shorthand props (`mb`, `gap`, `alignItems`, `fontWeight`, `textAlign`, etc.) are not accepted in MUI v9 — they were removed. Only component-specific props (`variant`, `color` on Typography, `direction`/`spacing` on Stack, etc.) remain as direct props.

**SQLite sales history:** `api/server.js` runs a persistent server-side SSE connection to EarthMC that writes all sales to `/data/earthmc_sales.db` even when no browser is open. Browser also POSTs events as a backup. Table: `emc_sales` (id, recorded_at, event_type, player_name, item, price, amount, shop_type, stock, raw_json). Endpoints: `GET /api/earthmc/sales`, `POST /api/earthmc/sales`.

**Planned future work:**
- Contributor tracking per item (who supplies each item, their % cut, staff cuts) — data would live separately (not from API, which is read-only)
- The user maintains a spreadsheet for this — future idea is to surface it alongside live stock data

## EarthMC API v4 — complete reference

Base: `https://api.earthmc.net/v4`

All requests: `POST` with `Content-Type: application/json`. Body always has `{ "query": [...] }`.

**Public endpoints (no key required):**
| Endpoint | Body | Returns |
|---|---|---|
| `POST /players` | `{"query":["name or uuid"]}` | Array of player objects |
| `POST /nations` | `{"query":["name or uuid"]}` | Array of nation objects |
| `POST /towns` | `{"query":["name or uuid"]}` | Array of town objects |
| `GET /online` | — | `{ players: [{name}], ...}` |
| `GET /` | — | Server metadata (version, stats, moon phase) |

**Private endpoints (API key required):**

`POST /shop` — CRITICAL: key goes in POST body ONLY. Do NOT send an `Authorization: Bearer` header — it will return "Could not find an owner for this API key". The correct format is:
```json
{ "query": ["PLAYER_UUID"], "key": "API_KEY" }
```
- The UUID must be the same player who owns the API key, or an empty list is returned.
- Response format: `[{ "1": shopObj, "2": shopObj, ... }]` — an array with ONE element that is a dict of counter_id → shop. Flatten with `Object.values(data[0])`.
- Shop object fields: `item` (string), `price` (number), `amount` (number), `type` ("selling"|"buying"), `stock` (number). No `location` field (docs don't mention it).
- Rate limit: very aggressive. Server-side 5-min cache in `api/server.js` prevents repeat hits.

`GET /events?listen=EventType1,EventType2` — SSE stream. Requires `Authorization: Bearer API_KEY` in headers. Event types: `ShopSoldItem`, `ShopBoughtItem`, `ShopOutOfStock`, `ShopOutOfSpace`, `ShopOutOfGold`.

**kakoritz player UUID:** `5964140b-a902-48f6-832a-a385c0e17145`

**CORS:** EarthMC's API returns 404 on CORS preflight. All calls must be proxied server-to-server (NAS Express → EarthMC). Never call EarthMC directly from the browser.

**Proxy routes in `api/server.js`:**
- `POST /api/earthmc/players` → `/players`
- `POST /api/earthmc/nations` → `/nations`
- `POST /api/earthmc/towns` → `/towns`
- `POST /api/earthmc/shop` → `/shop` (adds key from env, no auth header)
- `GET /api/earthmc/events` → `/events` (SSE, proxied with Bearer header)

## Etsy integration (Etsy.tsx)

**Status:** OAuth pending Etsy approval. `VITE_ETSY_KEY` and `VITE_ETSY_SECRET` are in GitHub secrets. API key is passed to `dashboard-api` as `ETSY_API_KEY` env var.

**Planned scope (orders + messages only):**
- **Orders tab** — open orders, highlight anything unfulfilled >24h in red
- **Messages tab** — buyer conversations, flag any unanswered thread >24h; inline reply composer

**API:** `https://openapi.etsy.com/v3`. Public endpoints use `x-api-key` header; private use OAuth2 Bearer. Rate limit: 5 QPS / 5K QPD.

**Proxy stubs in `api/server.js`:**
- `GET /api/etsy/orders` → `/application/shops/me/receipts?status=open&limit=25`
- `GET /api/etsy/messages` → `/application/conversations?limit=25`

These endpoints are wired up but will return errors until OAuth is approved and token is configured. Do NOT ping Etsy URLs until OAuth approval is confirmed.

**Portal card:** Etsy card (orange, `#f97316`) navigates to the Etsy page via `onNavigate` prop on Portal. No longer a "coming soon" gray stub.

## Outlook integration (planned)

**Goal:** Scan inbox, auto-move spam, surface threads needing a reply within 24h, auto-draft responses (using Claude API server-side).

**Auth path:** Microsoft Graph API via Azure app registration (free). Refresh token stored as server env var. Uses `adam@adamscottspiker.org`.

**Not yet started** — awaiting user direction on which accounts to connect and whether domain is on Microsoft 365 or self-hosted Exchange.

## Portal structure

Sections: **Lab & Tools** (DSM, AdGuard, Docker, GitHub Actions, Router, VPN, Plex), **Finance & Communication** (Banking, Email), **Integrations** (Telegram stub, Etsy → Etsy page).

Streaming section (YouTube, Netflix, Disney+) was removed. Plex merged into Lab & Tools.

`Portal` accepts `onNavigate?: (page: string) => void` — passed from `App.tsx` so cards can deep-link to other pages (e.g. Etsy card navigates to `'etsy'`).

## CI loop behavior

When babysitting GitHub Actions: only monitor during an active push. Once the run completes green, stop — do not maintain a persistent background monitor between pushes.

## Photo API categories (server.js)
`jaxson`, `sophia`, `evelyn`, `family`, `wedding`, `maternity`, `animals` — each maps to one or more folder names under the Photos root.

## Pages that need live data wired up (currently static/mock)
- **Overview** — NAS status, CPU temp, weather value are hardcoded
- **LabMonitor** — all gauge values are hardcoded; needs a NAS metrics API (Synology API or custom endpoint)
- **Analytics** — network and storage data is randomly generated on render

## Theme
Dark mode only. Background: `#0f0f1a` (default), `#1a1a2e` (paper). Primary: `#6366f1` (indigo). Font: Inter/Roboto.

## Git / GitHub
- Remote: `git@github.com:kakoritz/project-kakoritz.git`
- Default branch: `main`
- SSH auth works from this machine (kakoritz GitHub account)
