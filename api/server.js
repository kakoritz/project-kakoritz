const express = require('express')
const cors = require('cors')
const fs = require('fs')
const path = require('path')

const app = express()
app.use(cors())
app.use(express.json())

const ROOT       = process.env.PHOTOS_ROOT || '/photos'
const TASKS_FILE = process.env.TASKS_FILE  || path.join(ROOT, 'kakoritz_tasks.json')
const IMAGE_EXTS = /\.(jpg|jpeg|png|gif|webp|bmp)$/i

// ── Task helpers ──────────────────────────────────────────────────────────────
function readTasks() {
  try { return JSON.parse(fs.readFileSync(TASKS_FILE, 'utf8')) } catch { return [] }
}
function writeTasks(tasks) {
  fs.writeFileSync(TASKS_FILE, JSON.stringify(tasks, null, 2))
}

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
  for (const folder of cat.folders) {
    all = all.concat(getImages(path.join(ROOT, folder)))
  }
  return all
}

function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)]
}

function toRelative(abs) {
  return abs.replace(ROOT, '').replace(/^\//, '')
}

app.get('/api/categories', (req, res) => {
  const result = Object.entries(CATEGORIES).map(([id, cat]) => {
    const images = getCategoryImages(id)
    const thumb = images.length ? toRelative(randomItem(images)) : null
    return { id, label: cat.label, emoji: cat.emoji, count: images.length, thumbnail: thumb }
  })
  res.json(result)
})

app.get('/api/category/:id', (req, res) => {
  const images = getCategoryImages(req.params.id)
  res.json(images.map(toRelative))
})

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

// ── EarthMC proxies ───────────────────────────────────────────────────────────
// Browser can't hit api.earthmc.net directly with auth headers (CORS preflight
// returns 404, not 2xx). Proxy server-to-server instead.

async function emcProxy(path, body, res) {
  try {
    const r = await fetch(`https://api.earthmc.net/v4${path}`, {
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
const SHOP_CACHE_TTL = 5 * 60 * 1000  // serve cached data for 5 minutes
let shopCache = { data: null, ts: 0, retryAfter: 0 }

app.post('/api/earthmc/shop', async (req, res) => {
  const key = process.env.EARTHMC_API_KEY || ''
  if (!key) return res.status(503).json({ error: 'EARTHMC_API_KEY not configured on server' })

  const now = Date.now()

  // Still inside a rate-limit cooldown — return cached data if we have it, else 429
  if (shopCache.retryAfter > now) {
    const waitSec = Math.ceil((shopCache.retryAfter - now) / 1000)
    if (shopCache.data) {
      return res.json({ _cached: true, _cachedAt: shopCache.ts, _retryAfter: waitSec, shops: shopCache.data })
    }
    return res.status(429).json({ error: `Too Many Requests. Try again in ${waitSec} seconds`, retryAfter: waitSec })
  }

  // Cache is still fresh — skip the upstream call entirely
  if (shopCache.data && (now - shopCache.ts) < SHOP_CACHE_TTL) {
    return res.json({ _cached: true, _cachedAt: shopCache.ts, shops: shopCache.data })
  }

  try {
    const r = await fetch('https://api.earthmc.net/v4/shop', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` },
      body: JSON.stringify({ ...req.body, key }),
    })
    const text = await r.text()
    let data
    try { data = JSON.parse(text) } catch { data = { error: text } }

    if (r.status === 429) {
      const retryAfterHeader = r.headers.get('Retry-After')
      const waitSec = retryAfterHeader ? parseInt(retryAfterHeader, 10) : 3600
      shopCache.retryAfter = now + waitSec * 1000
      if (shopCache.data) {
        return res.json({ _cached: true, _cachedAt: shopCache.ts, _retryAfter: waitSec, shops: shopCache.data })
      }
      return res.status(429).json({ error: `Too Many Requests. Try again in ${waitSec} seconds`, retryAfter: waitSec })
    }

    if (r.ok && Array.isArray(data)) {
      shopCache = { data, ts: now, retryAfter: 0 }
      return res.json({ shops: data })
    }

    res.status(r.status).json(data)
  } catch (e) {
    res.status(502).json({ error: e.message })
  }
})

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

app.get('/health', (_, res) => res.json({ status: 'ok', root: ROOT }))

app.listen(3001, () => console.log(`Photo API — root: ${ROOT}`))
