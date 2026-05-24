import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  Divider, Grid, IconButton, InputAdornment,
  Stack, Tab, Tabs, TextField, Tooltip, Typography,
} from '@mui/material'
import RefreshIcon from '@mui/icons-material/Refresh'
import SearchIcon from '@mui/icons-material/Search'
import StorefrontIcon from '@mui/icons-material/Storefront'
import WifiIcon from '@mui/icons-material/Wifi'
import WifiOffIcon from '@mui/icons-material/WifiOff'
import PeopleIcon from '@mui/icons-material/People'
import SecurityIcon from '@mui/icons-material/Security'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

// ── Config ────────────────────────────────────────────────────────────────────
const API_KEY     = import.meta.env.VITE_EARTHMC_API_KEY  ?? ''
const PLAYER_NAME = import.meta.env.VITE_EARTHMC_PLAYER   ?? 'kakoritz'
const NATION_NAME = import.meta.env.VITE_EARTHMC_NATION   ?? 'Narmada'
const API_BASE    = 'https://api.earthmc.net/v4'
const SHOP_POLL   = 30_000

// ── Types ─────────────────────────────────────────────────────────────────────
interface Shop {
  item: string
  price: number
  amount: number
  type: 'selling' | 'buying'
  stock: number
  location: { x: number; y: number; z: number }
}

interface NationInfo {
  name: string
  king?: { name: string }
  capital?: { name: string }
  residents: { name: string }[]
  allies: { name: string }[]
  enemies: { name: string }[]
  stats?: { balance?: number; numTownBlocks?: number }
}

interface LiveEvent {
  id: string
  eventType: string
  timestamp: number
  playerName?: string
  shop?: Shop
}

type StockLevel = 'out' | 'low' | 'ok'

// ── Helpers ───────────────────────────────────────────────────────────────────
const fmtItem = (s: string) =>
  s.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, c => c.toUpperCase())

const fmtGold = (n: number) =>
  n.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 }) + 'g'

const fmtTime = (ts: number) =>
  new Date(ts * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })

const stockLevel = (stock: number): StockLevel => {
  if (stock === 0) return 'out'
  if (stock < 64) return 'low'
  return 'ok'
}

const STOCK_COLOR: Record<StockLevel, string> = {
  out: '#ef4444',
  low: '#f59e0b',
  ok:  '#22c55e',
}

const EVENT_COLOR: Record<string, string> = {
  ShopSoldItem:   '#22c55e',
  ShopBoughtItem: '#60a5fa',
  ShopOutOfStock: '#f59e0b',
  ShopOutOfSpace: '#f59e0b',
  ShopOutOfGold:  '#ef4444',
}

const EVENT_LABEL: Record<string, string> = {
  ShopSoldItem:   'Sale',
  ShopBoughtItem: 'Purchase',
  ShopOutOfStock: 'Out of Stock',
  ShopOutOfSpace: 'Out of Space',
  ShopOutOfGold:  'Out of Gold',
}

const SSE_EVENTS = 'ShopSoldItem,ShopBoughtItem,ShopOutOfStock,ShopOutOfSpace,ShopOutOfGold'

// ── Component ─────────────────────────────────────────────────────────────────
export default function EarthMC() {
  const [tab, setTab]                 = useState(0)
  const [shops, setShops]             = useState<Shop[]>([])
  const [nation, setNation]           = useState<NationInfo | null>(null)
  const [online, setOnline]           = useState<string[]>([])
  const [events, setEvents]           = useState<LiveEvent[]>([])
  const [loading, setLoading]         = useState(true)
  const [error, setError]             = useState<string | null>(null)
  const [sseConnected, setSseConnected] = useState(false)
  const [search, setSearch]           = useState('')
  const [uuid, setUuid]               = useState('')

  const sseAbort = useRef<AbortController | null>(null)

  // ── API calls ───────────────────────────────────────────────────────────────
  const getUUID = useCallback(async (): Promise<string> => {
    const res = await fetch(`${API_BASE}/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: [PLAYER_NAME] }),
    })
    if (!res.ok) throw new Error(`Players API ${res.status}`)
    const data = await res.json() as { name: string; UUID: string }[]
    const player = data.find(p => p.name.toLowerCase() === PLAYER_NAME.toLowerCase())
    if (!player?.UUID) throw new Error(`Player "${PLAYER_NAME}" not found`)
    return player.UUID
  }, [])

  const fetchShops = useCallback(async (playerUUID: string) => {
    const res = await fetch(`${API_BASE}/shop`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: [playerUUID], key: API_KEY }),
    })
    if (!res.ok) throw new Error(`Shop API ${res.status}`)
    const data = await res.json()
    setShops(Array.isArray(data) ? data as Shop[] : [])
  }, [])

  const fetchNation = useCallback(async () => {
    const res = await fetch(`${API_BASE}/nations`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: [NATION_NAME] }),
    })
    if (!res.ok) return
    const data = await res.json() as NationInfo[]
    if (data[0]) setNation(data[0])
  }, [])

  const fetchOnline = useCallback(async () => {
    const res = await fetch(`${API_BASE}/online`)
    if (!res.ok) return
    const data = await res.json() as { players?: { name: string }[] }
    setOnline(data.players?.map(p => p.name) ?? [])
  }, [])

  // ── SSE live feed ───────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!API_KEY) return
    sseAbort.current?.abort()
    const ctrl = new AbortController()
    sseAbort.current = ctrl

    fetch(`${API_BASE}/events?listen=${SSE_EVENTS}`, {
      headers: { Authorization: `Bearer ${API_KEY}` },
      signal: ctrl.signal,
    })
      .then(async res => {
        if (!res.ok || !res.body) throw new Error(`SSE ${res.status}`)
        setSseConnected(true)

        const reader = res.body.getReader()
        const dec = new TextDecoder()
        let buf = ''
        let eventType = ''

        while (true) {
          const { done, value } = await reader.read()
          if (done) break
          buf += dec.decode(value, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ') && eventType) {
              try {
                const payload = JSON.parse(line.slice(6))
                const shop: Shop | undefined = payload.shop ?? (payload.item ? payload : undefined)
                const ev: LiveEvent = {
                  id:         `${Date.now()}-${Math.random()}`,
                  eventType,
                  timestamp:  payload.timestamp ?? Math.floor(Date.now() / 1000),
                  playerName: payload.buyer ?? payload.seller ?? undefined,
                  shop,
                }
                setEvents(prev => [ev, ...prev].slice(0, 150))
                if (shop) {
                  setShops(prev => prev.map(s =>
                    s.item === shop.item &&
                    s.location.x === shop.location.x &&
                    s.location.z === shop.location.z
                      ? { ...s, stock: shop.stock }
                      : s
                  ))
                }
              } catch { /* malformed SSE data */ }
              eventType = ''
            }
          }
        }
      })
      .catch(err => {
        setSseConnected(false)
        if (err.name !== 'AbortError') setTimeout(connectSSE, 5000)
      })
  }, [])

  // ── Initial load ────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (existingUUID?: string) => {
    try {
      setLoading(true)
      setError(null)
      const playerUUID = existingUUID ?? (uuid || await getUUID())
      if (!uuid) setUuid(playerUUID)
      await Promise.all([fetchShops(playerUUID), fetchNation(), fetchOnline()])
    } catch (e) {
      setError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [uuid, getUUID, fetchShops, fetchNation, fetchOnline])

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Poll shops every 30s
  useEffect(() => {
    if (!uuid) return
    const id = setInterval(() => fetchShops(uuid).catch(() => {}), SHOP_POLL)
    return () => clearInterval(id)
  }, [uuid, fetchShops])

  // Connect SSE
  useEffect(() => {
    connectSSE()
    return () => sseAbort.current?.abort()
  }, [connectSSE])

  // ── Derived data ────────────────────────────────────────────────────────────
  const filtered = shops.filter(s =>
    fmtItem(s.item).toLowerCase().includes(search.toLowerCase())
  )

  const alerts = shops.filter(s => stockLevel(s.stock) !== 'ok')
  const outCount = alerts.filter(s => s.stock === 0).length
  const lowCount = alerts.filter(s => s.stock > 0 && s.stock < 64).length

  // ── Guard ───────────────────────────────────────────────────────────────────
  if (!API_KEY) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Add <code>VITE_EARTHMC_API_KEY=your_key</code> to <code>.env.local</code> for local dev,
        and to GitHub Secrets for production builds.
      </Alert>
    )
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

      {/* ── Page header ────────────────────────────────────────────────────── */}
      <Stack direction="row" alignItems="center" justifyContent="space-between" mb={2} flexWrap="wrap" gap={1}>
        <Box>
          <Typography variant="h5" fontWeight={800} letterSpacing={1}>
            EarthMC
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {NATION_NAME} · Sita Mega Shop
          </Typography>
        </Box>

        <Stack direction="row" gap={1} alignItems="center" flexWrap="wrap">
          <Chip
            icon={<PeopleIcon sx={{ fontSize: '14px !important' }} />}
            label={`${online.length} online`}
            size="small"
            sx={{ bgcolor: 'rgba(99,102,241,0.15)', color: '#a5b4fc' }}
          />
          <Tooltip title={sseConnected ? 'Live feed connected' : 'Reconnecting…'}>
            <Chip
              icon={sseConnected
                ? <WifiIcon    sx={{ fontSize: '14px !important', color: '#22c55e !important' }} />
                : <WifiOffIcon sx={{ fontSize: '14px !important', color: '#ef4444 !important' }} />}
              label={sseConnected ? 'Live' : 'Offline'}
              size="small"
              sx={{
                bgcolor: sseConnected ? 'rgba(34,197,94,0.12)' : 'rgba(239,68,68,0.12)',
                color:   sseConnected ? '#22c55e' : '#ef4444',
              }}
            />
          </Tooltip>
          <IconButton size="small" onClick={() => loadAll(uuid || undefined)} disabled={loading}>
            <RefreshIcon sx={{ fontSize: 18 }} />
          </IconButton>
        </Stack>
      </Stack>

      {/* ── Error ──────────────────────────────────────────────────────────── */}
      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      {/* ── Stock alert banner ─────────────────────────────────────────────── */}
      {alerts.length > 0 && (
        <Alert
          severity={outCount > 0 ? 'error' : 'warning'}
          icon={<WarningAmberIcon />}
          sx={{ mb: 2 }}
        >
          {outCount > 0 && <><strong>{outCount} out of stock</strong>{lowCount > 0 ? ' · ' : ''}</>}
          {lowCount > 0 && <><strong>{lowCount} low stock</strong></>}
          {' — '}
          {alerts.map(s => fmtItem(s.item)).join(', ')}
        </Alert>
      )}

      {/* ── Tabs ───────────────────────────────────────────────────────────── */}
      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{
          mb: 2,
          '& .MuiTab-root': { fontWeight: 600, letterSpacing: 0.5, minHeight: 40 },
          '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
        }}
      >
        <Tab
          label={`Shops (${shops.length})`}
          icon={<StorefrontIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ minWidth: 120 }}
        />
        <Tab
          label={events.length ? `Live Feed (${events.length})` : 'Live Feed'}
          sx={{ minWidth: 130 }}
        />
        <Tab
          label="Nation"
          icon={<SecurityIcon sx={{ fontSize: 16 }} />}
          iconPosition="start"
          sx={{ minWidth: 100 }}
        />
      </Tabs>

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 0 — SHOPS
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 0 && (
        <Box>
          {loading && (
            <Box sx={{ mb: 2 }}>
              <Stack direction="row" gap={1} alignItems="center">
                <CircularProgress size={14} />
                <Typography variant="caption" color="text.secondary">Loading shops…</Typography>
              </Stack>
            </Box>
          )}

          <TextField
            size="small"
            placeholder="Filter items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                </InputAdornment>
              ),
            }}
            sx={{ mb: 2, width: { xs: '100%', sm: 300 } }}
          />

          {(['selling', 'buying'] as const).map(type => {
            const group = filtered.filter(s => s.type === type)
            if (!group.length) return null
            return (
              <Box key={type} mb={3}>
                <Typography
                  variant="overline"
                  color="text.secondary"
                  sx={{ letterSpacing: 2, mb: 1.5, display: 'block', fontWeight: 700 }}
                >
                  {type === 'selling' ? '💰 Selling' : '🛒 Buying'} — {group.length} shops
                </Typography>

                <Grid container spacing={1.5}>
                  {group
                    .sort((a, b) => stockLevel(a.stock) === 'out' ? -1 : stockLevel(b.stock) === 'out' ? 1 : a.stock - b.stock)
                    .map((shop, i) => {
                      const level = stockLevel(shop.stock)
                      const col   = STOCK_COLOR[level]
                      const priceEach = shop.price / shop.amount

                      return (
                        <Grid key={i} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              borderColor: level === 'out'
                                ? 'rgba(239,68,68,0.45)'
                                : level === 'low'
                                  ? 'rgba(245,158,11,0.35)'
                                  : 'rgba(255,255,255,0.08)',
                              bgcolor: level === 'out' ? 'rgba(239,68,68,0.06)' : 'background.paper',
                              transition: 'transform 0.15s, border-color 0.15s',
                              '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
                            }}
                          >
                            <CardContent sx={{ p: '12px !important' }}>
                              {/* Item name */}
                              <Typography
                                variant="body2"
                                fontWeight={700}
                                noWrap
                                title={fmtItem(shop.item)}
                                sx={{ mb: 0.75, lineHeight: 1.3 }}
                              >
                                {fmtItem(shop.item)}
                              </Typography>

                              {/* Stock indicator */}
                              <Stack direction="row" alignItems="center" gap={0.5} mb={0.75}>
                                <Box sx={{
                                  width: 7, height: 7, borderRadius: '50%',
                                  bgcolor: col, flexShrink: 0,
                                  boxShadow: `0 0 5px ${col}80`,
                                }} />
                                <Typography variant="caption" color={col} fontWeight={700} sx={{ lineHeight: 1 }}>
                                  {shop.stock === 0 ? 'OUT' : shop.stock.toLocaleString()}
                                </Typography>
                                {shop.stock > 0 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                    in stock
                                  </Typography>
                                )}
                              </Stack>

                              <Divider sx={{ mb: 0.75, opacity: 0.25 }} />

                              {/* Price */}
                              <Stack direction="row" justifyContent="space-between" alignItems="baseline">
                                <Typography variant="caption" color="text.secondary">
                                  {shop.amount}x
                                </Typography>
                                <Typography variant="caption" fontWeight={700} color="#f59e0b">
                                  {fmtGold(shop.price)}
                                </Typography>
                              </Stack>

                              {shop.amount > 1 && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, opacity: 0.7 }}>
                                  {fmtGold(priceEach)}/ea
                                </Typography>
                              )}

                              {/* Coordinates */}
                              <Typography
                                variant="caption"
                                color="text.secondary"
                                sx={{ fontSize: 9, display: 'block', mt: 0.5, opacity: 0.45, fontFamily: 'monospace' }}
                              >
                                {shop.location.x} {shop.location.y} {shop.location.z}
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      )
                    })}
                </Grid>
              </Box>
            )
          })}

          {!loading && filtered.length === 0 && (
            <Typography color="text.secondary" textAlign="center" py={6}>
              {shops.length === 0 ? 'No shops returned — check your API key.' : 'No items match the filter.'}
            </Typography>
          )}
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 1 — LIVE FEED
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 1 && (
        <Box>
          {!sseConnected && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack direction="row" gap={1} alignItems="center">
                <CircularProgress size={12} />
                <span>Connecting to live event stream…</span>
              </Stack>
            </Alert>
          )}

          {events.length === 0 ? (
            <Box textAlign="center" py={8}>
              <Typography color="text.secondary" mb={1}>Waiting for shop activity…</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
                Sales, purchases, and stock alerts will appear here in real time.
              </Typography>
            </Box>
          ) : (
            <Stack gap={1} sx={{ maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', pr: 0.5 }}>
              {events.map(ev => {
                const col = EVENT_COLOR[ev.eventType] ?? '#6366f1'
                return (
                  <Card
                    key={ev.id}
                    variant="outlined"
                    sx={{
                      borderColor: `${col}35`,
                      bgcolor:     `${col}08`,
                      flexShrink: 0,
                    }}
                  >
                    <CardContent sx={{ py: '10px !important', px: '14px !important' }}>
                      <Stack direction="row" alignItems="center" gap={1} flexWrap="wrap">
                        <Chip
                          label={EVENT_LABEL[ev.eventType] ?? ev.eventType}
                          size="small"
                          sx={{
                            bgcolor: `${col}20`,
                            color:   col,
                            fontWeight: 700,
                            height: 20,
                            fontSize: 10,
                            letterSpacing: 0.3,
                          }}
                        />
                        {ev.shop && (
                          <Typography variant="body2" fontWeight={600}>
                            {fmtItem(ev.shop.item)}
                          </Typography>
                        )}
                        {ev.playerName && (
                          <Typography variant="caption" color="text.secondary">
                            — <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{ev.playerName}</strong>
                          </Typography>
                        )}
                        {ev.shop && (
                          <Typography variant="caption" color="#f59e0b" fontWeight={600}>
                            {fmtGold(ev.shop.price)}
                          </Typography>
                        )}
                        <Typography variant="caption" color="text.secondary" sx={{ ml: 'auto', fontFamily: 'monospace', fontSize: 11 }}>
                          {fmtTime(ev.timestamp)}
                        </Typography>
                      </Stack>

                      {ev.shop && (
                        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.25, display: 'block', fontSize: 10, opacity: 0.6 }}>
                          {ev.shop.amount}× · stock after: {ev.shop.stock.toLocaleString()}
                        </Typography>
                      )}
                    </CardContent>
                  </Card>
                )
              })}
            </Stack>
          )}
        </Box>
      )}

      {/* ══════════════════════════════════════════════════════════════════════
          TAB 2 — NATION
      ══════════════════════════════════════════════════════════════════════ */}
      {tab === 2 && (
        <Box>
          {loading && !nation && (
            <Stack direction="row" gap={1} alignItems="center" mb={2}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Loading nation data…</Typography>
            </Stack>
          )}

          {nation ? (
            <Grid container spacing={2}>

              {/* Nation overview card */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Stack direction="row" alignItems="center" gap={1} mb={2}>
                      <SecurityIcon sx={{ color: 'primary.main', fontSize: 20 }} />
                      <Typography variant="h6" fontWeight={800}>{nation.name}</Typography>
                    </Stack>
                    <Stack gap={1.25}>
                      <StatRow label="King"        value={nation.king?.name ?? '—'} />
                      <StatRow label="Capital"     value={nation.capital?.name ?? '—'} />
                      <StatRow label="Balance"     value={fmtGold(nation.stats?.balance ?? 0)} gold />
                      <StatRow label="Residents"   value={nation.residents.length.toString()} />
                      <StatRow label="Town Blocks" value={nation.stats?.numTownBlocks?.toLocaleString() ?? '—'} />
                      <StatRow label="Allies"      value={nation.allies.length.toString()} />
                      <StatRow label="Enemies"     value={nation.enemies.length.toString()} />
                    </Stack>
                  </CardContent>
                </Card>
              </Grid>

              {/* Residents — green if online */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Card variant="outlined" sx={{ height: '100%' }}>
                  <CardContent>
                    <Typography variant="overline" color="text.secondary" letterSpacing={2} fontWeight={700}>
                      Residents ({nation.residents.length})
                    </Typography>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, mt: 0.25, opacity: 0.6 }}>
                      Green = currently online
                    </Typography>
                    <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5 }}>
                      {[...nation.residents]
                        .sort((a, b) =>
                          online.includes(a.name) === online.includes(b.name) ? 0 :
                          online.includes(a.name) ? -1 : 1
                        )
                        .map(r => {
                          const isOnline = online.includes(r.name)
                          return (
                            <Chip
                              key={r.name}
                              label={r.name}
                              size="small"
                              sx={{
                                height: 22,
                                fontSize: 11,
                                bgcolor: isOnline ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.05)',
                                color:   isOnline ? '#22c55e' : 'text.secondary',
                                border:  isOnline ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                                fontWeight: isOnline ? 700 : 400,
                              }}
                            />
                          )
                        })}
                    </Box>
                  </CardContent>
                </Card>
              </Grid>

              {/* Allies & Enemies */}
              <Grid size={{ xs: 12, md: 4 }}>
                <Stack gap={2} height="100%">
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary" letterSpacing={2} fontWeight={700}>
                        Allies ({nation.allies.length})
                      </Typography>
                      {nation.allies.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>None</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {nation.allies.map(a => (
                            <Chip key={a.name} label={a.name} size="small"
                              sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 11, height: 22 }} />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>

                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary" letterSpacing={2} fontWeight={700}>
                        Enemies ({nation.enemies.length})
                      </Typography>
                      {nation.enemies.length === 0 ? (
                        <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>None</Typography>
                      ) : (
                        <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                          {nation.enemies.map(e => (
                            <Chip key={e.name} label={e.name} size="small"
                              sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 11, height: 22 }} />
                          ))}
                        </Box>
                      )}
                    </CardContent>
                  </Card>
                </Stack>
              </Grid>

            </Grid>
          ) : (
            !loading && <Alert severity="info">Nation "{NATION_NAME}" not found. Check the name matches exactly in-game.</Alert>
          )}
        </Box>
      )}

    </Box>
  )
}

// ── Tiny helper ───────────────────────────────────────────────────────────────
function StatRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <Stack direction="row" justifyContent="space-between" alignItems="center">
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" fontWeight={gold ? 700 : 500} color={gold ? '#f59e0b' : 'text.primary'}>
        {value}
      </Typography>
    </Stack>
  )
}
