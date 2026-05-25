import { useCallback, useEffect, useRef, useState } from 'react'
import {
  Alert, Box, Card, CardContent, Chip, CircularProgress,
  Dialog, DialogContent, DialogTitle,
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
import LaunchIcon from '@mui/icons-material/Launch'
import CloseIcon from '@mui/icons-material/Close'

// ── Config ────────────────────────────────────────────────────────────────────
const API_KEY     = import.meta.env.VITE_EARTHMC_API_KEY  ?? ''
const PLAYER_NAME = import.meta.env.VITE_EARTHMC_PLAYER   ?? 'kakoritz'
const NATION_NAME = import.meta.env.VITE_EARTHMC_NATION   ?? 'Narmada'
const API_BASE    = 'https://api.earthmc.net/v4'
const NAS_API   = 'http://192.168.1.251:8586'
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
  towns?: { name: string; uuid: string }[]
  allies: { name: string }[]
  enemies: { name: string }[]
  stats?: { balance?: number; numTownBlocks?: number }
}

interface TownInfo {
  name: string
  uuid: string
  board?: string
  mayor?: { name: string; uuid: string }
  stats?: { numTownBlocks?: number; maxTownBlocks?: number; numResidents?: number; balance?: number }
  coordinates?: { spawn?: { x: number; y: number; z: number }; homeBlock?: [number, number] }
  status?: { isCapital?: boolean; isPublic?: boolean; isOpen?: boolean; isNeutral?: boolean }
  residents?: { name: string; uuid: string }[]
  timestamps?: { registered?: number }
}

interface PlayerInfo {
  name: string
  uuid: string
  title?: string
  about?: string
  town?: { name: string }
  nation?: { name: string }
  timestamps?: { registered?: number; lastOnline?: number }
  status?: { isOnline?: boolean }
  stats?: { balance?: number; numFriends?: number }
  ranks?: { townRanks?: string[]; nationRanks?: string[] }
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

const mapUrl = (x: number, z: number) =>
  `https://map.earthmc.net/?world=minecraft_overworld&zoom=5&x=${Math.round(x)}&z=${Math.round(z)}`

// ── Component ─────────────────────────────────────────────────────────────────
export default function EarthMC() {
  const [tab, setTab]                       = useState(0)
  const [shops, setShops]                   = useState<Shop[]>([])
  const [nation, setNation]                 = useState<NationInfo | null>(null)
  const [online, setOnline]                 = useState<string[]>([])
  const [events, setEvents]                 = useState<LiveEvent[]>([])
  const [loading, setLoading]               = useState(true)
  const [shopError, setShopError]           = useState<string | null>(null)
  const [sseConnected, setSseConnected]     = useState(false)
  const [search, setSearch]                 = useState('')
  const [uuid, setUuid]                     = useState('')
  const [towns, setTowns]                   = useState<TownInfo[]>([])
  const [townsLoading, setTownsLoading]     = useState(false)
  const [selectedTown, setSelectedTown]     = useState<TownInfo | null>(null)
  const [playerDialogOpen, setPlayerDialogOpen] = useState(false)
  const [selectedPlayer, setSelectedPlayer] = useState<PlayerInfo | null>(null)
  const [playerLoading, setPlayerLoading]   = useState(false)

  const sseAbort        = useRef<AbortController | null>(null)
  const townsFetchedRef = useRef(false)

  // ── API calls ───────────────────────────────────────────────────────────────
  const getUUID = useCallback(async (): Promise<string> => {
    const res = await fetch(`${NAS_API}/api/earthmc/players`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: [PLAYER_NAME] }),
    })
    if (!res.ok) throw new Error(`Players API ${res.status}`)
    const data = await res.json() as { name: string; uuid: string }[]
    const player = data.find(p => p.name.toLowerCase() === PLAYER_NAME.toLowerCase())
    if (!player?.uuid) throw new Error(`Player "${PLAYER_NAME}" not found`)
    return player.uuid
  }, [])

  const fetchShops = useCallback(async (playerUUID: string) => {
    setShopError(null)
    try {
      const res = await fetch(`${NAS_API}/api/earthmc/shop`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: [playerUUID] }),
      })
      if (!res.ok) {
        const body = await res.json().catch(() => ({})) as { error?: string }
        throw new Error(body.error ?? `Shop API returned ${res.status}`)
      }
      const data = await res.json()
      setShops(Array.isArray(data) ? data as Shop[] : [])
    } catch (e) {
      setShopError((e as Error).message)
    }
  }, [])

  const fetchNation = useCallback(async () => {
    const res = await fetch(`${NAS_API}/api/earthmc/nations`, {
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

  const fetchTowns = useCallback(async (nationData: NationInfo) => {
    if (!nationData.towns?.length) return
    setTownsLoading(true)
    try {
      const uuids = nationData.towns.map(t => t.uuid)
      const res = await fetch(`${NAS_API}/api/earthmc/towns`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: uuids }),
      })
      if (!res.ok) return
      const data = await res.json() as TownInfo[]
      setTowns(Array.isArray(data) ? data : [])
    } catch { /* ignore */ } finally {
      setTownsLoading(false)
    }
  }, [])

  const fetchPlayer = useCallback(async (name: string) => {
    setSelectedPlayer(null)
    setPlayerDialogOpen(true)
    setPlayerLoading(true)
    try {
      const res = await fetch(`${NAS_API}/api/earthmc/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ query: [name] }),
      })
      if (!res.ok) return
      const data = await res.json() as PlayerInfo[]
      if (data[0]) setSelectedPlayer(data[0])
    } catch { /* ignore */ } finally {
      setPlayerLoading(false)
    }
  }, [])

  // ── SSE live feed ───────────────────────────────────────────────────────────
  const connectSSE = useCallback(() => {
    if (!API_KEY) return
    sseAbort.current?.abort()
    const ctrl = new AbortController()
    sseAbort.current = ctrl

    fetch(`${NAS_API}/api/earthmc/events?listen=${SSE_EVENTS}`, {
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
          buf += dec.decode(value as BufferSource, { stream: true })
          const lines = buf.split('\n')
          buf = lines.pop() ?? ''

          for (const line of lines) {
            if (line.startsWith('event: ')) {
              eventType = line.slice(7).trim()
            } else if (line.startsWith('data: ') && eventType) {
              try {
                const payload = JSON.parse(line.slice(6)) as Record<string, unknown>
                const shop = (payload.shop ?? (payload.item ? payload : undefined)) as Shop | undefined
                const ev: LiveEvent = {
                  id:         `${Date.now()}-${Math.random()}`,
                  eventType,
                  timestamp:  (payload.timestamp as number) ?? Math.floor(Date.now() / 1000),
                  playerName: (payload.buyer ?? payload.seller) as string | undefined,
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
        if ((err as Error).name !== 'AbortError') setTimeout(connectSSE, 5000)
      })
  }, [])

  // ── Initial load ────────────────────────────────────────────────────────────
  const loadAll = useCallback(async (existingUUID?: string) => {
    setLoading(true)
    try {
      const playerUUID = existingUUID ?? (uuid || await getUUID())
      if (!uuid) setUuid(playerUUID)
      await Promise.allSettled([fetchShops(playerUUID), fetchNation(), fetchOnline()])
    } catch (e) {
      setShopError((e as Error).message)
    } finally {
      setLoading(false)
    }
  }, [uuid, getUUID, fetchShops, fetchNation, fetchOnline])

  useEffect(() => { loadAll() }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (!uuid) return
    const id = setInterval(() => { fetchShops(uuid).catch(() => {}) }, SHOP_POLL)
    return () => clearInterval(id)
  }, [uuid, fetchShops])

  useEffect(() => {
    connectSSE()
    return () => sseAbort.current?.abort()
  }, [connectSSE])

  // Reset towns when nation reloads; auto-fetch when Nation tab opens
  useEffect(() => { townsFetchedRef.current = false; setTowns([]) }, [nation])
  useEffect(() => {
    if (tab !== 2 || !nation || townsFetchedRef.current) return
    townsFetchedRef.current = true
    fetchTowns(nation)
  }, [tab, nation, fetchTowns])

  // ── Derived data ────────────────────────────────────────────────────────────
  const filtered = shops.filter(s =>
    fmtItem(s.item).toLowerCase().includes(search.toLowerCase())
  )

  const alerts   = shops.filter(s => stockLevel(s.stock) !== 'ok')
  const outCount = alerts.filter(s => s.stock === 0).length
  const lowCount = alerts.filter(s => s.stock > 0 && s.stock < 64).length

  if (!API_KEY) {
    return (
      <Alert severity="warning" sx={{ m: 2 }}>
        Add <code>VITE_EARTHMC_API_KEY=your_key</code> to GitHub Secrets.
      </Alert>
    )
  }

  return (
    <Box sx={{ maxWidth: 1400, mx: 'auto' }}>

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <Stack
        direction="row"
        sx={{ alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 1, mb: 2 }}
      >
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 800, letterSpacing: 1 }}>
            EarthMC
          </Typography>
          <Typography variant="body2" color="text.secondary">
            {NATION_NAME} · Sita Mega Shop
          </Typography>
        </Box>

        <Stack direction="row" sx={{ gap: 1, alignItems: 'center', flexWrap: 'wrap' }}>
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

      {alerts.length > 0 && (
        <Alert severity={outCount > 0 ? 'error' : 'warning'} icon={<WarningAmberIcon />} sx={{ mb: 2 }}>
          {outCount > 0 && <><strong>{outCount} out of stock</strong>{lowCount > 0 ? ' · ' : ''}</>}
          {lowCount > 0 && <><strong>{lowCount} low stock</strong></>}
          {' — '}
          {alerts.map(s => fmtItem(s.item)).join(', ')}
        </Alert>
      )}

      <Tabs
        value={tab}
        onChange={(_, v: number) => setTab(v)}
        sx={{
          mb: 2,
          '& .MuiTab-root': { fontWeight: 600, letterSpacing: 0.5, minHeight: 40 },
          '& .MuiTabs-indicator': { bgcolor: 'primary.main' },
        }}
      >
        <Tab label={`Shops (${shops.length})`} icon={<StorefrontIcon sx={{ fontSize: 16 }} />} iconPosition="start" sx={{ minWidth: 120 }} />
        <Tab label={events.length ? `Live Feed (${events.length})` : 'Live Feed'} sx={{ minWidth: 130 }} />
        <Tab label="Nation" icon={<SecurityIcon sx={{ fontSize: 16 }} />} iconPosition="start" sx={{ minWidth: 100 }} />
      </Tabs>

      {/* ══ TAB 0 — SHOPS ══════════════════════════════════════════════════════ */}
      {tab === 0 && (
        <Box>
          {loading && (
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 2 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Loading shops…</Typography>
            </Stack>
          )}

          {shopError && (
            <Alert severity="error" sx={{ mb: 2 }}>
              Shop data unavailable: {shopError}
            </Alert>
          )}

          <TextField
            size="small"
            placeholder="Filter items…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            slotProps={{
              input: {
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon sx={{ fontSize: 18, color: 'text.secondary' }} />
                  </InputAdornment>
                ),
              },
            }}
            sx={{ mb: 2, width: { xs: '100%', sm: 300 } }}
          />

          {(['selling', 'buying'] as const).map(type => {
            const group = filtered.filter(s => s.type === type)
            if (!group.length) return null
            return (
              <Box key={type} sx={{ mb: 3 }}>
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
                      const level     = stockLevel(shop.stock)
                      const col       = STOCK_COLOR[level]
                      const priceEach = shop.price / shop.amount
                      return (
                        <Grid key={i} size={{ xs: 6, sm: 4, md: 3, lg: 2 }}>
                          <Card
                            variant="outlined"
                            sx={{
                              height: '100%',
                              borderColor: level === 'out' ? 'rgba(239,68,68,0.45)' : level === 'low' ? 'rgba(245,158,11,0.35)' : 'rgba(255,255,255,0.08)',
                              bgcolor: level === 'out' ? 'rgba(239,68,68,0.06)' : 'background.paper',
                              transition: 'transform 0.15s, border-color 0.15s',
                              '&:hover': { transform: 'translateY(-2px)', borderColor: 'primary.main' },
                            }}
                          >
                            <CardContent sx={{ p: '12px !important' }}>
                              <Typography variant="body2" noWrap title={fmtItem(shop.item)}
                                sx={{ mb: 0.75, lineHeight: 1.3, fontWeight: 700 }}>
                                {fmtItem(shop.item)}
                              </Typography>

                              <Stack direction="row" sx={{ alignItems: 'center', gap: 0.5, mb: 0.75 }}>
                                <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: col, flexShrink: 0, boxShadow: `0 0 5px ${col}80` }} />
                                <Typography variant="caption" color={col} sx={{ lineHeight: 1, fontWeight: 700 }}>
                                  {shop.stock === 0 ? 'OUT' : shop.stock.toLocaleString()}
                                </Typography>
                                {shop.stock > 0 && (
                                  <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
                                    in stock
                                  </Typography>
                                )}
                              </Stack>

                              <Divider sx={{ mb: 0.75, opacity: 0.25 }} />

                              <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'baseline' }}>
                                <Typography variant="caption" color="text.secondary">{shop.amount}x</Typography>
                                <Typography variant="caption" color="#f59e0b" sx={{ fontWeight: 700 }}>{fmtGold(shop.price)}</Typography>
                              </Stack>

                              {shop.amount > 1 && (
                                <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10, opacity: 0.7 }}>
                                  {fmtGold(priceEach)}/ea
                                </Typography>
                              )}

                              <Typography variant="caption" color="text.secondary"
                                sx={{ fontSize: 9, display: 'block', mt: 0.5, opacity: 0.45, fontFamily: 'monospace' }}>
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
            <Typography color="text.secondary" align="center" sx={{ py: 6 }}>
              {shops.length === 0 ? 'No shops returned — check your API key.' : 'No items match the filter.'}
            </Typography>
          )}
        </Box>
      )}

      {/* ══ TAB 1 — LIVE FEED ══════════════════════════════════════════════════ */}
      {tab === 1 && (
        <Box>
          {!sseConnected && (
            <Alert severity="info" sx={{ mb: 2 }}>
              <Stack direction="row" sx={{ gap: 1, alignItems: 'center' }}>
                <CircularProgress size={12} />
                <span>Connecting to live event stream…</span>
              </Stack>
            </Alert>
          )}

          {events.length === 0 ? (
            <Box sx={{ textAlign: 'center', py: 8 }}>
              <Typography color="text.secondary" sx={{ mb: 1 }}>Waiting for shop activity…</Typography>
              <Typography variant="caption" color="text.secondary" sx={{ opacity: 0.5 }}>
                Sales, purchases, and stock alerts will appear here in real time.
              </Typography>
            </Box>
          ) : (
            <Stack sx={{ gap: 1, maxHeight: 'calc(100vh - 280px)', overflowY: 'auto', pr: 0.5 }}>
              {events.map(ev => {
                const col = EVENT_COLOR[ev.eventType] ?? '#6366f1'
                return (
                  <Card key={ev.id} variant="outlined" sx={{ borderColor: `${col}35`, bgcolor: `${col}08`, flexShrink: 0 }}>
                    <CardContent sx={{ py: '10px !important', px: '14px !important' }}>
                      <Stack direction="row" sx={{ alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                        <Chip label={EVENT_LABEL[ev.eventType] ?? ev.eventType} size="small"
                          sx={{ bgcolor: `${col}20`, color: col, fontWeight: 700, height: 20, fontSize: 10, letterSpacing: 0.3 }} />
                        {ev.shop && (
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>{fmtItem(ev.shop.item)}</Typography>
                        )}
                        {ev.playerName && (
                          <Typography variant="caption" color="text.secondary">
                            — <strong style={{ color: 'rgba(255,255,255,0.75)' }}>{ev.playerName}</strong>
                          </Typography>
                        )}
                        {ev.shop && (
                          <Typography variant="caption" color="#f59e0b" sx={{ fontWeight: 600 }}>{fmtGold(ev.shop.price)}</Typography>
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

      {/* ══ TAB 2 — NATION ═════════════════════════════════════════════════════ */}
      {tab === 2 && (
        <Box>
          {loading && !nation && (
            <Stack direction="row" sx={{ gap: 1, alignItems: 'center', mb: 2 }}>
              <CircularProgress size={14} />
              <Typography variant="caption" color="text.secondary">Loading nation data…</Typography>
            </Stack>
          )}

          {nation ? (
            <>
              {/* ── Overview strip ─────────────────────────────────────────── */}
              <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(130px, 1fr))', gap: 1.5, mb: 3 }}>
                {([
                  { label: 'King',        value: nation.king?.name ?? '—' },
                  { label: 'Capital',     value: nation.capital?.name ?? '—' },
                  { label: 'Balance',     value: fmtGold(nation.stats?.balance ?? 0), gold: true },
                  { label: 'Residents',   value: String(nation.residents.length) },
                  { label: 'Town Blocks', value: nation.stats?.numTownBlocks?.toLocaleString() ?? '—' },
                  { label: 'Online',      value: String(online.filter(n => nation.residents.some(r => r.name === n)).length) },
                ] as { label: string; value: string; gold?: boolean }[]).map(({ label, value, gold }) => (
                  <Card key={label} variant="outlined" sx={{ textAlign: 'center', py: 1.5, px: 1 }}>
                    <Typography variant="caption" color="text.secondary" sx={{ display: 'block', letterSpacing: 0.5 }}>{label}</Typography>
                    <Typography variant="body1" sx={{ fontWeight: 800, color: gold ? '#f59e0b' : 'text.primary', mt: 0.25 }}>{value}</Typography>
                  </Card>
                ))}
              </Box>

              {/* ── Town cards ─────────────────────────────────────────────── */}
              <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2, fontWeight: 700, display: 'block', mb: 1.5 }}>
                Towns ({townsLoading ? '…' : towns.length})
              </Typography>

              {townsLoading ? (
                <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', mb: 3 }}>
                  <CircularProgress size={14} />
                  <Typography variant="caption" color="text.secondary">Loading town details…</Typography>
                </Stack>
              ) : (
                <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(230px, 1fr))', gap: 2, mb: 3 }}>
                  {towns.map(town => (
                    <TownCard key={town.uuid} town={town} online={online} onClick={() => setSelectedTown(town)} />
                  ))}
                  {towns.length === 0 && !nation.towns?.length && (
                    <Typography variant="caption" color="text.secondary">No town data in nation response.</Typography>
                  )}
                </Box>
              )}

              {/* ── Allies / Enemies ───────────────────────────────────────── */}
              <Grid container spacing={2}>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2, fontWeight: 700 }}>
                        Allies ({nation.allies.length})
                      </Typography>
                      {nation.allies.length === 0
                        ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>None</Typography>
                        : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {nation.allies.map(a => (
                              <Chip key={a.name} label={a.name} size="small"
                                sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc', fontSize: 11, height: 22 }} />
                            ))}
                          </Box>
                      }
                    </CardContent>
                  </Card>
                </Grid>
                <Grid size={{ xs: 12, sm: 6 }}>
                  <Card variant="outlined">
                    <CardContent>
                      <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2, fontWeight: 700 }}>
                        Enemies ({nation.enemies.length})
                      </Typography>
                      {nation.enemies.length === 0
                        ? <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 1 }}>None</Typography>
                        : <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.5, mt: 1 }}>
                            {nation.enemies.map(e => (
                              <Chip key={e.name} label={e.name} size="small"
                                sx={{ bgcolor: 'rgba(239,68,68,0.1)', color: '#f87171', fontSize: 11, height: 22 }} />
                            ))}
                          </Box>
                      }
                    </CardContent>
                  </Card>
                </Grid>
              </Grid>
            </>
          ) : (
            !loading && <Alert severity="info">Nation &quot;{NATION_NAME}&quot; not found — check the spelling matches in-game.</Alert>
          )}

          {/* ── Town detail dialog ──────────────────────────────────────────── */}
          <Dialog open={!!selectedTown} onClose={() => setSelectedTown(null)} maxWidth="sm" fullWidth>
            {selectedTown && (
              <>
                <DialogTitle sx={{ pb: 1 }}>
                  <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                    <Stack direction="row" sx={{ alignItems: 'center', gap: 1 }}>
                      <Typography variant="h6" sx={{ fontWeight: 800 }}>{selectedTown.name}</Typography>
                      {selectedTown.status?.isCapital && (
                        <Chip label="★ Capital" size="small" sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', height: 20 }} />
                      )}
                    </Stack>
                    <IconButton size="small" onClick={() => setSelectedTown(null)}>
                      <CloseIcon fontSize="small" />
                    </IconButton>
                  </Stack>
                </DialogTitle>
                <DialogContent>
                  <Stack sx={{ gap: 1, mb: 2 }}>
                    <StatRow label="Mayor"       value={selectedTown.mayor?.name ?? '—'} />
                    <StatRow label="Balance"     value={fmtGold(selectedTown.stats?.balance ?? 0)} gold />
                    <StatRow label="Town Blocks" value={`${selectedTown.stats?.numTownBlocks ?? 0} / ${selectedTown.stats?.maxTownBlocks ?? 0}`} />
                    <StatRow label="Residents"   value={String(selectedTown.residents?.length ?? 0)} />
                  </Stack>

                  <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mb: 2 }}>
                    {selectedTown.status?.isPublic  && <Chip label="Public"  size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(34,197,94,0.1)',    color: '#22c55e' }} />}
                    {selectedTown.status?.isOpen    && <Chip label="Open"    size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(99,102,241,0.1)',   color: '#a5b4fc' }} />}
                    {selectedTown.status?.isNeutral && <Chip label="Neutral" size="small" sx={{ height: 20, fontSize: 10, bgcolor: 'rgba(255,255,255,0.07)', color: 'text.secondary' }} />}
                  </Stack>

                  {selectedTown.coordinates?.spawn && (
                    <Box sx={{ mb: 2, p: 1.25, bgcolor: 'rgba(255,255,255,0.04)', borderRadius: 1.5, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="caption" sx={{ fontFamily: 'monospace', color: 'text.secondary' }}>
                        X {Math.round(selectedTown.coordinates.spawn.x)}, Z {Math.round(selectedTown.coordinates.spawn.z)}
                      </Typography>
                      <Chip
                        label="Open Map" size="small" clickable
                        icon={<LaunchIcon sx={{ fontSize: '12px !important' }} />}
                        onClick={() => window.open(mapUrl(selectedTown.coordinates!.spawn!.x, selectedTown.coordinates!.spawn!.z), '_blank', 'noopener,noreferrer')}
                        sx={{ fontSize: 11, height: 24 }}
                      />
                    </Box>
                  )}

                  <Divider sx={{ mb: 2 }} />

                  <Typography variant="overline" color="text.secondary" sx={{ letterSpacing: 2, fontWeight: 700, display: 'block', mb: 0.5 }}>
                    Residents ({selectedTown.residents?.length ?? 0})
                  </Typography>
                  <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mb: 1.5, opacity: 0.6 }}>
                    Click a name to look up their stats
                  </Typography>
                  <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 0.75 }}>
                    {[...(selectedTown.residents ?? [])]
                      .sort((a, b) => online.includes(a.name) === online.includes(b.name) ? 0 : online.includes(a.name) ? -1 : 1)
                      .map(r => {
                        const isOnline = online.includes(r.name)
                        return (
                          <Chip
                            key={r.name} label={r.name} size="small" clickable
                            onClick={() => fetchPlayer(r.name)}
                            sx={{
                              height: 24, fontSize: 11,
                              bgcolor: isOnline ? 'rgba(34,197,94,0.14)' : 'rgba(255,255,255,0.07)',
                              color:   isOnline ? '#22c55e' : 'text.secondary',
                              border:  isOnline ? '1px solid rgba(34,197,94,0.3)' : '1px solid transparent',
                              fontWeight: isOnline ? 700 : 400,
                              '&:hover': { bgcolor: 'rgba(99,102,241,0.2)', color: '#a5b4fc' },
                            }}
                          />
                        )
                      })}
                  </Box>
                </DialogContent>
              </>
            )}
          </Dialog>

          {/* ── Player detail dialog ────────────────────────────────────────── */}
          <Dialog open={playerDialogOpen} onClose={() => { setPlayerDialogOpen(false); setSelectedPlayer(null) }} maxWidth="xs" fullWidth>
            <DialogTitle sx={{ pb: 1 }}>
              <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between' }}>
                <Typography variant="h6" sx={{ fontWeight: 800 }}>
                  {playerLoading ? 'Looking up player…' : (selectedPlayer?.name ?? '')}
                </Typography>
                <IconButton size="small" onClick={() => { setPlayerDialogOpen(false); setSelectedPlayer(null) }}>
                  <CloseIcon fontSize="small" />
                </IconButton>
              </Stack>
            </DialogTitle>
            <DialogContent>
              {playerLoading ? (
                <Stack direction="row" sx={{ gap: 1.5, alignItems: 'center', py: 3, justifyContent: 'center' }}>
                  <CircularProgress size={20} />
                </Stack>
              ) : selectedPlayer && (
                <Stack sx={{ gap: 1 }}>
                  <Stack direction="row" sx={{ gap: 0.5, flexWrap: 'wrap', mb: 0.5 }}>
                    {selectedPlayer.status?.isOnline && (
                      <Chip label="Online" size="small" sx={{ height: 20, bgcolor: 'rgba(34,197,94,0.14)', color: '#22c55e' }} />
                    )}
                    {selectedPlayer.ranks?.townRanks?.map(r => (
                      <Chip key={r} label={r} size="small" sx={{ height: 20, bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }} />
                    ))}
                    {selectedPlayer.ranks?.nationRanks?.map(r => (
                      <Chip key={r} label={`${r} (nation)`} size="small" sx={{ height: 20, bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }} />
                    ))}
                  </Stack>
                  {selectedPlayer.title  && <StatRow label="Title"   value={selectedPlayer.title} />}
                  {selectedPlayer.town   && <StatRow label="Town"    value={selectedPlayer.town.name} />}
                  {selectedPlayer.nation && <StatRow label="Nation"  value={selectedPlayer.nation.name} />}
                  <StatRow label="Balance" value={fmtGold(selectedPlayer.stats?.balance ?? 0)} gold />
                  {selectedPlayer.timestamps?.registered && (
                    <StatRow label="Joined" value={new Date(selectedPlayer.timestamps.registered).toLocaleDateString()} />
                  )}
                  {selectedPlayer.timestamps?.lastOnline && (
                    <StatRow label="Last Online" value={new Date(selectedPlayer.timestamps.lastOnline).toLocaleDateString()} />
                  )}
                  {selectedPlayer.stats?.numFriends !== undefined && (
                    <StatRow label="Friends" value={String(selectedPlayer.stats.numFriends)} />
                  )}
                </Stack>
              )}
            </DialogContent>
          </Dialog>
        </Box>
      )}

    </Box>
  )
}

// ── Helpers ───────────────────────────────────────────────────────────────────
function StatRow({ label, value, gold }: { label: string; value: string; gold?: boolean }) {
  return (
    <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
      <Typography variant="body2" color="text.secondary">{label}</Typography>
      <Typography variant="body2" color={gold ? '#f59e0b' : 'text.primary'} sx={{ fontWeight: gold ? 700 : 500 }}>
        {value}
      </Typography>
    </Stack>
  )
}

function TownCard({ town, online, onClick }: { town: TownInfo; online: string[]; onClick: () => void }) {
  const residents    = town.residents ?? []
  const onlineCount  = residents.filter(r => online.includes(r.name)).length
  const spawn        = town.coordinates?.spawn
  return (
    <Card
      variant="outlined"
      onClick={onClick}
      sx={{
        cursor: 'pointer',
        transition: 'transform 0.15s, border-color 0.15s',
        '&:hover': { transform: 'translateY(-3px)', borderColor: 'primary.main' },
      }}
    >
      <CardContent sx={{ pb: '12px !important' }}>
        <Stack direction="row" sx={{ alignItems: 'center', gap: 0.75, mb: 1.5 }}>
          <Typography variant="body1" sx={{ fontWeight: 800, flex: 1 }}>{town.name}</Typography>
          {town.status?.isCapital && (
            <Chip label="★" size="small" sx={{ height: 18, fontSize: 11, bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', minWidth: 0 }} />
          )}
        </Stack>

        <Stack sx={{ gap: 0.75 }}>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Mayor</Typography>
            <Typography variant="caption" sx={{ fontWeight: 600 }}>{town.mayor?.name ?? '—'}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Residents</Typography>
            <Stack direction="row" sx={{ gap: 0.5, alignItems: 'center' }}>
              <Typography variant="caption" sx={{ fontWeight: 600 }}>{residents.length}</Typography>
              {onlineCount > 0 && (
                <Chip label={`${onlineCount} online`} size="small"
                  sx={{ height: 16, fontSize: 9, bgcolor: 'rgba(34,197,94,0.14)', color: '#22c55e' }} />
              )}
            </Stack>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Gold</Typography>
            <Typography variant="caption" sx={{ fontWeight: 700, color: '#f59e0b' }}>{fmtGold(town.stats?.balance ?? 0)}</Typography>
          </Stack>
          <Stack direction="row" sx={{ justifyContent: 'space-between', alignItems: 'center' }}>
            <Typography variant="caption" color="text.secondary">Blocks</Typography>
            <Typography variant="caption">{town.stats?.numTownBlocks ?? 0} / {town.stats?.maxTownBlocks ?? 0}</Typography>
          </Stack>
        </Stack>

        {spawn && (
          <Box sx={{ mt: 1.5, pt: 1, borderTop: '1px solid rgba(255,255,255,0.06)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace', fontSize: 10 }}>
              {Math.round(spawn.x)}, {Math.round(spawn.z)}
            </Typography>
            <IconButton
              size="small"
              onClick={e => { e.stopPropagation(); window.open(mapUrl(spawn.x, spawn.z), '_blank', 'noopener,noreferrer') }}
              sx={{ p: 0.25 }}
            >
              <LaunchIcon sx={{ fontSize: 14, color: 'text.secondary' }} />
            </IconButton>
          </Box>
        )}
      </CardContent>
    </Card>
  )
}
