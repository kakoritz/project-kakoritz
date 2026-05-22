# KAKORITZ Dashboard — CLAUDE.md

## What this is
A personal home lab dashboard built with React + TypeScript + Vite + MUI (Material UI v9). It runs inside Docker on a Synology NAS (`spiker-nas-1`, `192.168.1.251`) and is accessible on the local network at port 8585. A companion Node/Express photo API runs on the same NAS at port 8586.

## Deploy pipeline
Push to `main` → GitHub Actions runs two jobs in parallel:

1. **`build-and-push`** (GitHub-hosted runner): builds the React app into a Docker image, pushes to `ghcr.io/kakoritz/project-kakoritz:latest`.
2. **`build-photo-api`** (self-hosted runner on the NAS): builds `./photo-api`, saves/loads the image over SSH to the NAS, then restarts the `photo-api` container.
3. **`deploy-dashboard`** (self-hosted runner, depends on `build-and-push`): SSHs into the NAS, pulls the new image, restarts the `project-kakoritz` container.

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
    Portal.tsx      # App portal: Synology DSM, GitHub, Router, Cloud Storage link cards
    Gallery.tsx     # Family photo gallery — category cards → drill-in with lightbox

photo-api/
  server.js         # Express API serving photos from /volume1/Data/Pictures/FAMILY on NAS
  Dockerfile        # Node 24-alpine image, port 3001

Dockerfile          # Multi-stage: node build → nginx:alpine, port 80
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
