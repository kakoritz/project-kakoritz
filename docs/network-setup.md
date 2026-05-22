# Network & NAS Security Setup

## Infrastructure

| Device | IP | Notes |
|---|---|---|
| Synology NAS (spiker-nas-1) | 192.168.1.251 | Always-on, runs all services |
| Router | 192.168.1.1 | ASUS RT-AC68U |
| Laptop | 192.168.1.152 | kakoritz-laptop |

## DNS — AdGuard Home

**Container:** `adguard/adguardhome` running in Synology Container Manager  
**Admin UI:** `http://192.168.1.251:3001`  
**Login:** kakoritz account (password in AdGuardHome.yaml bcrypt hash)  
**Config file location on NAS:** `/volume2/docker/adguardhome/conf/AdGuardHome.yaml`  

### Port mappings (Container Manager)
| Host port | Container port | Protocol | Purpose |
|---|---|---|---|
| 3001 | 3001 | TCP | Admin web UI |
| 53 | 53 | TCP + UDP | DNS |

### How it works
Router's DHCP advertises `192.168.1.251` as DNS for all devices.  
Every DNS query goes → AdGuard Home → Quad9 (`dns10.quad9.net`) if not blocked.  
Blocked domains return NXDOMAIN — ads/trackers never load.

### Router DNS setting
ASUS RT-AC68U → LAN → DHCP Server → DNS Server: `192.168.1.251`  
(Single field — no secondary DNS configured)

### Active blocklists
| List | Category | Purpose |
|---|---|---|
| AdGuard DNS filter | General | Default, already on at setup |
| Peter Lowe's Blocklist | General | Ads + tracking |
| OISD Blocklist Big | General | Comprehensive catch-all |
| HaGeZi's Pro Blocklist | General | High-quality curated list |
| ShadowWhisperer Tracking List | General | Tracking pixels |
| Perflyst & Dandelion Sprout's Smart-TV | Other | Fire TV + smart TV telemetry |
| Dandelion Sprout's Anti Push Notifications | Other | Browser notification prompts |
| Phishing URL Blocklist | Security | Phishing domains |
| Dandelion Sprout's Anti-Malware | Security | Malware domains |

### Adding/managing rules
- **Whitelist a broken site:** Query Log → find the blocked request → click Allow
- **Block a specific domain:** Filters → Custom Filtering Rules → add `||domain.com^`
- **DNS rewrite (custom hostname):** Filters → DNS Rewrites

### DNS Rewrites (custom internal hostnames)
| Hostname | Resolves to | Purpose |
|---|---|---|
| kakoritz | 192.168.1.251 | Dashboard shortcut |

## Dashboard — project-kakoritz

**URL (internal):** `http://kakoritz` or `http://192.168.1.251:8585`  
**Container:** `ghcr.io/kakoritz/project-kakoritz:latest`  
**Port:** 8585 → 80 (nginx inside container)  

### Reverse proxy (planned)
To make `http://kakoritz` work without a port number, add in DSM:  
Control Panel → Login Portal → Advanced → Reverse Proxy  
- Source: `http://kakoritz:80`  
- Destination: `http://localhost:8585`

## Photo API

**URL:** `http://192.168.1.251:8586`  
**Container:** `photo-api:latest` (built by self-hosted GitHub Actions runner)  
**Photo root on NAS:** `/volume1/Data/Pictures/FAMILY`  
**Port:** 8586 → 3001 (Express inside container)

## Deployment pipeline

Push to `main` on GitHub → Actions runs 3 jobs:
1. `build-and-push` — builds dashboard Docker image → pushes to `ghcr.io/kakoritz/project-kakoritz:latest`
2. `build-photo-api` — self-hosted runner builds photo-api → SSH deploys to NAS
3. `deploy-dashboard` — self-hosted runner SSHs into NAS → pulls + restarts dashboard container

**Self-hosted runner:** runs on the NAS itself  
**NAS SSH user:** `aspiker`

## Things to do / come back to

- [ ] Set up Synology reverse proxy so `http://kakoritz` works without the port number
- [ ] Explore adding more specific Fire TV blocklists (AmazonFireTV.txt via custom URL)
- [ ] Consider enabling HaGeZi's Samsung Tracker Blocklist if a Samsung TV is on the network
- [ ] Look into Synology HTTPS cert so dashboard can be served over HTTPS internally
