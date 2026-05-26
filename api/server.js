const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')
const Database = require('better-sqlite3')

const app = express()
app.use(cors())
app.use(express.json())

const ROOT       = process.env.PHOTOS_ROOT || '/photos'
const TASKS_FILE = process.env.TASKS_FILE  || path.join(ROOT, 'kakoritz_tasks.json')
const DATA_DIR   = process.env.DATA_DIR    || '/data'
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|bmp)$/i

// ── SQLite sales DB ────────────────────────────────────────────────────────────
let db = null
try {
  fs.mkdirSync(DATA_DIR, { recursive: true })
  db = new Database(path.join(DATA_DIR, 'earthmc_sales.db'))
  db.exec(`
    CREATE TABLE IF NOT EXISTS emc_sales (
      id           INTEGER PRIMARY KEY AUTOINCREMENT,
      recorded_at  TEXT NOT NULL,
      event_type   TEXT NOT NULL,
      player_name  TEXT,
      item         TEXT,
      price        REAL,
      amount       INTEGER,
      shop_type    TEXT,
      stock        INTEGER,
      raw_json     TEXT NOT NULL
    )
  `)
} catch (e) {
  console.error('SQLite init failed:', e.message)
}

const stmtInsertSale = db ? db.prepare(
  `INSERT INTO emc_sales (recorded_at, event_type, player_name, item, price, amount, shop_type, stock, raw_json)
   VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
) : null

function recordSale(eventType, payload) {
  if (!stmtInsertSale) return
  try {
    const shop = payload.shop || (payload.item ? payload : null)
    stmtInsertSale.run(
      new Date().toISOString(),
      eventType,
      payload.buyer || payload.seller || null,
      shop?.item || null,
      shop?.price ?? null,
      shop?.amount ?? null,
      shop?.type || null,
      shop?.stock ?? null,
      JSON.stringify(payload)
    )
  } catch (e) {
    console.error('recordSale error:', e.message)
  }
}

// ── Task helpers ──────────────────────────────────────────────────────────────
function readTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')) } catch { return [] }
}
function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

// ── Photo categories ───────────────────────────────────────────────────────────
const CATEGORIES = {
  jaxson:    { label: 'Jaxson',     emoji: '👦', folders: ['Jaxson'] },
  sophia:    { label: 'Sophia',     emoji: '👧', folders: ['Sophia', 'Sophia  Baby Photos'] },
  evelyn:    { label: 'Evelyn',     emoji: '🍼', folders: ['Eveylnn Faith'] },
  family:    { label: 'Family',     emoji: '👨‍👩‍👧‍👦', folders: ['Family', 'Family Photos 2024', 'Family Photos 2025', 'Beach 2025'] },
  wedding:   { label: 'Wedding',    emoji: '💍', folders: ['Wedding'] },
  maternity: { label: 'Maternity',  emoji: '🤰', folders: ['Materinity 2023', 'Preggo Pics'] },
  animals:   { label: 'Animals',    emoji: '🐾', folders: ['Animals', 'Big Brother - Lilly'] },
}

function getImages(dir) {
  let results = []
  try {
    const entries = fs.readdirSync(dir, { withFileTypes: true })
    for (const e of entries) {
      const full = path.join(dir, e.name)
      if (e.isFile() && IMAGE_EXTS.test(e.name)) results.push(full)
      else if (e.isDirectory() && !e.name.startsWith('.') && !e.name.startsWith('@')) results = results.concat(getImages(full))
    }
  } catch {}
  return results
}

function getCategoryImages(id) {
  const cat = CATEGORIES[id]
  if (!cat) return []
  let all = []
  for (const folder of cat.folders) all = all.concat(getImages(path.join(ROOT, folder)))
  return all
}

function randomItem(arr) { return arr[Math.floor(Math.random() * arr.length)] }
function toRelative(abs) { return abs.replace(ROOT, '').replace(/^\//, '') }

app.get('/api/categories', (req, res) => {
  const result = Object.entries(CATEGORIES).map(([id, cat]) => {
    const images = getCategoryImages(id)
    const thumb = images.length ? toRelative(randomItem(images)) : null
    return { id, label: cat.label, emoji: cat.emoji, count: images.length, thumbnail: thumb }
  })
  res.json(result)
})

app.get('/api/category/:id', (req, res) => res.json(getCategoryImages(req.params.id).map(toRelative)))
app.get('/api/photos', (req, res) => {
  let all = []
  for (const id of Object.keys(CATEGORIES)) all = all.concat(getCategoryImages(id))
  res.json(all.map(toRelative))
})

app.use('/photos', (req, res) => {
  const filePath = path.join(ROOT, decodeURIComponent(req.path))
  if (!filePath.startsWith(ROOT)) return res.status(403).send('Forbidden')
  res.sendFile(filePath)
})

// ── Task routes ───────────────────────────────────────────────────────────────
app.get('/api/tasks', (_, res) => res.json(readTasks()))

app.post('/api/tasks', (req, res) => {
  const tasks = readTasks()
  const task  = { createdAt: new Date().toISOString(), ...req.body }
  tasks.push(task)
  writeTasks(tasks)
  res.json(task)
})

app.put('/api/tasks/:id', (req, res) => {
  const tasks = readTasks()
  const i     = tasks.findIndex(t => t.id === req.params.id)
  if (i === -1) return res.status(404).json({ error: 'Not found' })
  tasks[i] = { ...tasks[i], ...req.body }
  writeTasks(tasks)
  res.json(tasks[i])
})

app.delete('/api/tasks/:id', (req, res) => {
  writeTasks(readTasks().filter(t => t.id !== req.params.id))
  res.json({ ok: true })
})

// ── Etsy API proxy (OAuth pending approval) ───────────────────────────────────
const ETSY_BASE = 'https://openapi.etsy.com/v3'

async function etsyGet(path, res) {
  const key = process.env.ETSY_API_KEY || ''
  if (!key) return res.status(503).json({ error: 'ETSY_API_KEY not configured' })
  try {
    const r = await fetch(`${ETSY_BASE}${path}`, {
      headers: { 'x-api-key': key, 'Accept': 'application/json' },
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }
    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

// Stub endpoints — will return live data once OAuth is approved and ETSY_API_KEY is active
app.get('/api/etsy/orders',   (req, res) => etsyGet('/application/shops/me/receipts?status=open&limit=25', res))
app.get('/api/etsy/messages', (req, res) => etsyGet('/application/conversations?limit=25', res))

// ── Outlook / Microsoft Graph proxy (Azure app registration pending) ──────────
const GRAPH_BASE = 'https://graph.microsoft.com/v1.0'

async function graphGet(path, res) {
  const token = process.env.OUTLOOK_ACCESS_TOKEN || ''
  if (!token) return res.status(503).json({ error: 'OUTLOOK_ACCESS_TOKEN not configured — register Azure app first' })
  try {
    const r = await fetch(`${GRAPH_BASE}${path}`, {
      headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }
    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

// Inbox: most recent 25 messages
app.get('/api/outlook/inbox', (req, res) =>
  graphGet('/me/mailFolders/inbox/messages?$top=25&$orderby=receivedDateTime+desc&$select=id,subject,from,receivedDateTime,isRead,bodyPreview', res)
)
// Threads needing reply: messages in inbox with no sent reply in last 24h (simplified: unflagged, no reply)
app.get('/api/outlook/needs-reply', (req, res) =>
  graphGet('/me/mailFolders/inbox/messages?$top=25&$orderby=receivedDateTime+desc&$filter=isRead+eq+true+and+flag/flagStatus+eq+\'notFlagged\'&$select=id,subject,from,receivedDateTime,isRead,bodyPreview', res)
)
// Move message to Junk
app.post('/api/outlook/move-junk', async (req, res) => {
  const token = process.env.OUTLOOK_ACCESS_TOKEN || ''
  if (!token) return res.status(503).json({ error: 'OUTLOOK_ACCESS_TOKEN not configured' })
  const { messageId } = req.body
  if (!messageId) return res.status(400).json({ error: 'messageId required' })
  try {
    const r = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/move`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ destinationId: 'junkemail' }),
    })
    const data = await r.json().catch(() => ({}))
    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})
// Send a reply
app.post('/api/outlook/reply', async (req, res) => {
  const token = process.env.OUTLOOK_ACCESS_TOKEN || ''
  if (!token) return res.status(503).json({ error: 'OUTLOOK_ACCESS_TOKEN not configured' })
  const { messageId, body } = req.body
  if (!messageId || !body) return res.status(400).json({ error: 'messageId and body required' })
  try {
    const r = await fetch(`${GRAPH_BASE}/me/messages/${messageId}/reply`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      body: JSON.stringify({ message: { body: { contentType: 'text', content: body } } }),
    })
    res.status(r.status).json({ ok: r.ok })
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

// ── EarthMC proxies ───────────────────────────────────────────────────────────
async function emcProxy(urlPath, body, res) {
  try {
    const r = await fetch(`https://api.earthmc.net/v4${urlPath}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }
    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
}

app.post('/api/earthmc/players', (req, res) => emcProxy('/players', req.body, res))
app.post('/api/earthmc/nations', (req, res) => emcProxy('/nations', req.body, res))
app.post('/api/earthmc/towns',   (req, res) => emcProxy('/towns',   req.body, res))

// Shop cache: avoid hammering EarthMC's rate-limited endpoint
const SHOP_CACHE_TTL = 5 * 60 * 1000
let shopCache = { data: null, ts: 0, retryAfter: 0 }

app.post('/api/earthmc/shop', async (req, res) => {
  const key = process.env.EARTHMC_API_KEY || ''
  if (!key) return res.status(503).json({ error: 'EARTHMC_API_KEY not configured on server' })

  const now = Date.now()

  if (shopCache.retryAfter > now) {
    const waitSec = Math.ceil((shopCache.retryAfter - now) / 1000)
    if (shopCache.data) return res.json({ _cached: true, _cachedAt: shopCache.ts, _retryAfter: waitSec, shops: shopCache.data })
    return res.status(429).json({ error: `Too Many Requests. Try again in ${waitSec} seconds`, retryAfter: waitSec })
  }

  if (shopCache.data && (now - shopCache.ts) < SHOP_CACHE_TTL) {
    return res.json({ _cached: true, _cachedAt: shopCache.ts, shops: shopCache.data })
  }

  try {
    // EarthMC shop auth: key in POST body only — NOT Authorization header
    const r = await fetch('https://api.earthmc.net/v4/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query: req.body.query, key }),
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }

    if (r.status === 429) {
      const waitSec = parseInt(r.headers.get('Retry-After') || '3600', 10)
      shopCache.retryAfter = now + waitSec * 1000
      if (shopCache.data) return res.json({ _cached: true, _cachedAt: shopCache.ts, _retryAfter: waitSec, shops: shopCache.data })
      return res.status(429).json({ error: `Too Many Requests. Try again in ${waitSec} seconds`, retryAfter: waitSec })
    }

    if (r.ok) {
      // Response: [{ "1": shopObj, "2": shopObj }] — flatten to array
      let shops = []
      if (Array.isArray(data) && data.length > 0 && typeof data[0] === 'object') {
        shops = Object.values(data[0])
      } else if (Array.isArray(data)) {
        shops = data
      }
      shopCache = { data: shops, ts: now, retryAfter: 0 }
      return res.json({ shops })
    }

    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

// ── EarthMC sales history (SQLite) ────────────────────────────────────────────
app.get('/api/earthmc/sales', (req, res) => {
  if (!db) return res.status(503).json({ error: 'Sales DB not available' })
  const limit  = Math.min(parseInt(req.query.limit)  || 200, 2000)
  const offset = parseInt(req.query.offset) || 0
  const rows = db.prepare(
    'SELECT * FROM emc_sales ORDER BY id DESC LIMIT ? OFFSET ?'
  ).all(limit, offset)
  const total = db.prepare('SELECT COUNT(*) AS n FROM emc_sales').get()?.n ?? 0
  res.json({ total, rows })
})

// Browser can POST an event it received via SSE (backup persistence)
app.post('/api/earthmc/sales', (req, res) => {
  if (!stmtInsertSale) return res.status(503).json({ error: 'Sales DB not available' })
  try {
    const { event_type, player_name, item, price, amount, shop_type, stock } = req.body
    stmtInsertSale.run(
      new Date().toISOString(),
      event_type || 'unknown',
      player_name || null,
      item || null,
      price ?? null,
      amount ?? null,
      shop_type || null,
      stock ?? null,
      JSON.stringify(req.body)
    )
    res.json({ ok: true })
  } catch (e) {
    res.status(500).json({ error: e.message })
  }
})

// ── EarthMC SSE proxy (browser live feed) ─────────────────────────────────────
app.get('/api/earthmc/events', async (req, res) => {
  const key = process.env.EARTHMC_API_KEY || ''
  if (!key) return res.status(503).json({ error: 'EARTHMC_API_KEY not configured on server' })
  const ctrl = new AbortController()
  req.on('close', () => ctrl.abort())
  res.setHeader('Content-Type', 'text/event-stream')
  res.setHeader('Cache-Control', 'no-cache')
  res.setHeader('Connection', 'keep-alive')
  res.flushHeaders()
  try {
    const listen = req.query.listen || ''
    const r = await fetch(`https://api.earthmc.net/v4/events?listen=${listen}`, {
      headers: { Authorization: `Bearer ${key}` },
      signal: ctrl.signal,
    })
    if (!r.ok || !r.body) {
      res.write(`data: {"error":"EarthMC events ${r.status}"}\n\n`)
      return res.end()
    }
    const reader = r.body.getReader()
    while (true) {
      const { done, value } = await reader.read()
      if (done) break
      res.write(Buffer.from(value))
    }
  } catch (e) {
    if (!ctrl.signal.aborted) res.write(`data: {"error":"${e.message}"}\n\n`)
  }
  res.end()
})

// ── Server-side persistent SSE sales recorder ─────────────────────────────────
// Runs independently of any browser connection — records all sales to SQLite
// even when no one has the dashboard open.
const RECORD_EVENTS = 'ShopSoldItem,ShopBoughtItem,ShopOutOfStock,ShopOutOfSpace,ShopOutOfGold'

function startSalesRecorder() {
  const key = process.env.EARTHMC_API_KEY || ''
  if (!key || !db) return

  async function connect() {
    try {
      const r = await fetch(`https://api.earthmc.net/v4/events?listen=${RECORD_EVENTS}`, {
        headers: { Authorization: `Bearer ${key}` },
      })
      if (!r.ok || !r.body) {
        console.log(`[recorder] EarthMC events returned ${r.status}, retrying in 60s`)
        return setTimeout(connect, 60_000)
      }
      console.log('[recorder] Connected to EarthMC event stream')
      const reader = r.body.getReader()
      const dec = new TextDecoder()
      let buf = ''
      let eventType = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buf += dec.decode(value, { stream: true })
        const lines = buf.split('\n')
        buf = lines.pop() || ''
        for (const line of lines) {
          if (line.startsWith('event: ')) {
            eventType = line.slice(7).trim()
          } else if (line.startsWith('data: ') && eventType) {
            try {
              const payload = JSON.parse(line.slice(6))
              if (['ShopSoldItem', 'ShopBoughtItem'].includes(eventType)) {
                recordSale(eventType, payload)
              }
            } catch { }
            eventType = ''
          }
        }
      }
    } catch (e) {
      console.log('[recorder] Disconnected:', e.message)
    }
    // Reconnect after any error or stream end
    setTimeout(connect, 5_000)
  }

  connect()
}

app.get('/health', (_, res) => res.json({ status: 'ok', root: ROOT, salesDb: !!db }))

app.listen(3001, () => {
  console.log(`Dashboard API — root: ${ROOT}`)
  // Start SSE sales recorder after server is up
  setTimeout(startSalesRecorder, 2_000)
})
