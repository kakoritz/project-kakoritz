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

app.get('/health', (_, res) => res.json({ status: 'ok', root: ROOT }))

app.listen(3001, () => console.log(`Photo API — root: ${ROOT}`))
