import { useState, useEffect, useRef, useCallback } from 'react'
import {
  Box, Typography, TextField, IconButton, Chip, Tabs, Tab,
  List, ListItem, Checkbox, CircularProgress, Tooltip,
  Popover, Button, Dialog, DialogTitle, DialogContent, DialogActions,
} from '@mui/material'
import AddIcon          from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AutoAwesomeIcon  from '@mui/icons-material/AutoAwesome'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'
import PersonIcon       from '@mui/icons-material/Person'

// ── Constants ─────────────────────────────────────────────────────────────────

const TASKS_API  = 'http://192.168.1.251:8586/api/tasks'
const CLAUDE_API = 'http://192.168.1.251:8587'
const WHO_KEY    = 'kakoritz_who'
const OLD_KEY    = 'kakoritz_tasks'          // legacy localStorage key
const POLL_MS    = 30_000

const TAG_COLORS: Record<string, string> = {
  work: '#6366f1', personal: '#22c55e', health: '#ef4444',
  finance: '#f59e0b', family: '#a78bfa', home: '#fb923c',
  errands: '#84cc16', bills: '#f59e0b',
}
const WHO_PALETTE = ['#6366f1', '#ec4899', '#22c55e', '#f59e0b', '#38bdf8', '#a78bfa']

const tagColor = (tag: string) => TAG_COLORS[tag.toLowerCase()] ?? 'rgba(255,255,255,0.35)'
function whoColor(name: string) {
  let h = 0
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % WHO_PALETTE.length
  return WHO_PALETTE[Math.abs(h)]
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface Task {
  id: string
  title: string
  dueDate: string
  completed: boolean
  completedAt?: string
  isEvent: boolean
  tags: string[]
  who: string
  createdAt: string
}

type AIResult =
  | { type: 'add';    title: string; dueDate: string | null; isEvent: boolean; tags: string[]; who?: string }
  | { type: 'update'; taskId: string; changes: { dueDate?: string; tags?: string[]; completed?: boolean } }
  | { type: 'unknown' }

// ── Date helpers ──────────────────────────────────────────────────────────────

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function offsetDate(days: number) {
  const d = new Date(); d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}
function daysUntil(dateStr: string) {
  return Math.round((new Date(dateStr + 'T00:00:00').getTime() - new Date(todayStr() + 'T00:00:00').getTime()) / 86_400_000)
}
function dueBadge(dueDate: string, isEvent: boolean) {
  const days = daysUntil(dueDate)
  if (days < 0)   return { label: `${Math.abs(days)}d overdue`, color: '#ef4444' }
  if (days === 0) return { label: 'Today',    color: '#f59e0b' }
  if (days === 1) return { label: 'Tomorrow', color: '#38bdf8' }
  if (days <= 7)  return { label: `in ${days}d`, color: '#6366f1' }
  const label = new Date(dueDate + 'T00:00:00').toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { label: isEvent ? `${label} · in ${days}d` : label, color: isEvent ? '#a78bfa' : 'rgba(255,255,255,0.4)' }
}
function normalize(t: any, fallbackWho = ''): Task {
  return {
    ...t,
    tags:    t.tags    ?? [],
    dueDate: (t.dueDate && t.dueDate !== 'null') ? t.dueDate : offsetDate(1),
    who:     t.who     ?? fallbackWho,
  }
}

// ── API ───────────────────────────────────────────────────────────────────────

async function apiFetch(path: string, opts?: RequestInit) {
  const r = await fetch(TASKS_API.replace('/api/tasks', '') + path, opts)
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}
const api = {
  list:   ()                  => apiFetch('/api/tasks') as Promise<Task[]>,
  create: (t: Omit<Task,'createdAt'>) => apiFetch('/api/tasks', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(t) }) as Promise<Task>,
  update: (id: string, changes: Partial<Task>) => apiFetch(`/api/tasks/${id}`, { method:'PUT', headers:{'Content-Type':'application/json'}, body: JSON.stringify(changes) }),
  remove: (id: string)        => apiFetch(`/api/tasks/${id}`, { method:'DELETE' }),
}

// ── AI ────────────────────────────────────────────────────────────────────────

const CMD_RE = /^(move|reschedule|change|update|mark|tag|push|shift|cancel|delete|remove)\s/i

async function callAI(input: string, tasks: Task[], myName: string, signal?: AbortSignal): Promise<AIResult> {
  const tomorrow = offsetDate(1)
  const taskList = tasks.slice(0, 30).map(t =>
    `id:${t.id} who:"${t.who}" "${t.title}" due:${t.dueDate} tags:[${t.tags.join(',')}]`
  ).join('\n')

  const prompt =
`Today is ${todayStr()}, tomorrow is ${tomorrow}. Current user is "${myName}".
Manage this shared family task list. Input is either a new task OR a command to update an existing task.

Existing tasks:
${taskList || '(none)'}

Tags: work, personal, health, finance, family, home, errands, bills

Return ONE JSON object only — no markdown:
• Add:    {"type":"add","title":"...","dueDate":"YYYY-MM-DD","isEvent":false,"tags":["..."],"who":"${myName}"}
  – Default dueDate to ${tomorrow} if not mentioned. isEvent=true for birthdays/holidays.
  – Set who to the person named in input if different from current user, else "${myName}".
• Update: {"type":"update","taskId":"exact-id","changes":{"dueDate":"YYYY-MM-DD"}}
• Other:  {"type":"unknown"}

Input: ${input}`

  const res = await fetch(`${CLAUDE_API}/api/chat`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
    signal,
  })
  if (!res.ok || !res.body) throw new Error('API error')

  const reader = res.body.getReader()
  const dec    = new TextDecoder()
  let buf = '', full = ''
  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n'); buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const p = line.slice(6); if (p === '[DONE]') break
      try { const j = JSON.parse(p); if (j.text) full += j.text } catch { /* skip */ }
    }
  }
  const s = full.indexOf('{'), e = full.lastIndexOf('}')
  if (s !== -1 && e !== -1) return JSON.parse(full.slice(s, e + 1)) as AIResult
  return { type: 'unknown' }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), ms)
  return Promise.race([
    promise.finally(() => clearTimeout(timer)),
    new Promise<T>((_, rej) => ctrl.signal.addEventListener('abort', () => rej(new Error('timeout')))),
  ])
}

// ── Date picker popover ───────────────────────────────────────────────────────

function DatePopover({ anchorEl, onClose, onSelect }: {
  anchorEl: HTMLElement | null; onClose: () => void; onSelect: (d: string) => void
}) {
  const [custom, setCustom] = useState('')
  return (
    <Popover open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { bgcolor: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, backgroundImage: 'none', minWidth: 150 } } }}
    >
      <Box sx={{ p: 1 }}>
        {[['Today', 0],['Tomorrow', 1],['In 3 days', 3],['Next week', 7]].map(([label, days]) => (
          <Button key={label as string} fullWidth size="small"
            onClick={() => { onSelect(offsetDate(days as number)); onClose() }}
            sx={{ justifyContent: 'flex-start', color: 'text.secondary', py: 0.5, fontSize: 13, borderRadius: 1.5, '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.06)' } }}
          >{label}</Button>
        ))}
        <Box sx={{ mt: 0.5, pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <TextField type="date" size="small" fullWidth value={custom}
            onChange={e => setCustom(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter' && custom) { onSelect(custom); onClose() } }}
            sx={{ '& .MuiOutlinedInput-root': { fontSize: 12, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' } } }}
          />
        </Box>
      </Box>
    </Popover>
  )
}

// ── Task row ──────────────────────────────────────────────────────────────────

function TaskRow({ task, onToggle, onDelete, onReschedule }: {
  task: Task; onToggle: () => void; onDelete: () => void; onReschedule: (d: string) => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const badge = dueBadge(task.dueDate, task.isEvent)
  const wc    = whoColor(task.who)

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <Box sx={{
        display: 'flex', flexDirection: 'column', width: '100%',
        py: 0.875, px: 1.5, borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.02)',
        borderTop: '1px solid rgba(255,255,255,0.04)',
        borderRight: '1px solid rgba(255,255,255,0.04)',
        borderBottom: '1px solid rgba(255,255,255,0.04)',
        borderLeft: `3px solid ${wc}`,
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox checked={task.completed} onChange={onToggle} size="small"
            sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&.Mui-checked': { color: 'primary.main' } }}
          />
          <Typography sx={{
            flex: 1, fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word',
            textDecoration: task.completed ? 'line-through' : 'none',
            color: task.completed ? 'text.disabled' : 'text.primary',
          }}>
            {task.isEvent ? '📅 ' : ''}{task.title}
          </Typography>
          <Tooltip title="Click to reschedule">
            <Chip label={badge.label} size="small" onClick={e => setAnchor(e.currentTarget)}
              sx={{ height: 20, fontSize: 11, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                bgcolor: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}35`,
                '& .MuiChip-label': { px: 1 }, '&:hover': { bgcolor: `${badge.color}30` } }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={onDelete}
              sx={{ p: 0.5, color: 'rgba(255,255,255,0.15)', '&:hover': { color: '#ef4444' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {/* Who + tags row */}
        <Box sx={{ display: 'flex', gap: 0.5, pl: 4.5, mt: 0.4, flexWrap: 'wrap', alignItems: 'center' }}>
          <Chip label={task.who || '?'} size="small"
            sx={{ height: 15, fontSize: 10, bgcolor: `${wc}18`, color: wc,
              border: `1px solid ${wc}30`, '& .MuiChip-label': { px: 0.75 } }}
          />
          {task.tags.map(tag => (
            <Chip key={tag} label={tag} size="small"
              sx={{ height: 15, fontSize: 10, bgcolor: `${tagColor(tag)}15`, color: tagColor(tag),
                border: `1px solid ${tagColor(tag)}30`, '& .MuiChip-label': { px: 0.75 } }}
            />
          ))}
        </Box>

        <DatePopover anchorEl={anchor} onClose={() => setAnchor(null)} onSelect={onReschedule} />
      </Box>
    </ListItem>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [tasks,      setTasks]      = useState<Task[]>([])
  const [loading,    setLoading]    = useState(true)
  const [error,      setError]      = useState('')
  const [myName,     setMyName]     = useState(() => localStorage.getItem(WHO_KEY) ?? '')
  const [nameDialog, setNameDialog] = useState(false)
  const [nameInput,  setNameInput]  = useState('')
  const [input,      setInput]      = useState('')
  const [parsing,    setParsing]    = useState(false)
  const [feedback,   setFeedback]   = useState('')
  const [tab,        setTab]        = useState(0)
  const [tagFilter,  setTagFilter]  = useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  // ── load + poll ─────────────────────────────────────────────────────────────
  const loadTasks = useCallback(async () => {
    try {
      const data = await api.list()
      setTasks(data.map(t => normalize(t)))
      setError('')
    } catch {
      setError('Could not reach task server')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    // migrate localStorage tasks to server on first load
    const migrated = localStorage.getItem('kakoritz_tasks_migrated')
    if (!migrated) {
      try {
        const old = JSON.parse(localStorage.getItem(OLD_KEY) ?? '[]') as any[]
        if (old.length > 0) {
          Promise.all(old.map(t => api.create(normalize(t, myName)))).then(() => loadTasks())
        }
      } catch { /* ignore */ }
      localStorage.setItem('kakoritz_tasks_migrated', '1')
    }

    void loadTasks()
    const interval = setInterval(() => void loadTasks(), POLL_MS)
    return () => clearInterval(interval)
  }, [loadTasks, myName])

  // open name dialog if no name set
  useEffect(() => {
    if (!myName) { setNameInput(''); setNameDialog(true) }
  }, [myName])

  const saveName = () => {
    const n = nameInput.trim()
    if (!n) return
    localStorage.setItem(WHO_KEY, n)
    setMyName(n)
    setNameDialog(false)
    inputRef.current?.focus()
  }

  // ── submit ──────────────────────────────────────────────────────────────────
  const submit = async () => {
    const text = input.trim()
    if (!text || parsing || !myName) return
    setInput(''); setFeedback('')

    const isCommand = CMD_RE.test(text)

    if (isCommand) {
      // Commands (move/reschedule/etc.) — brief spinner, AI with timeout
      setParsing(true)
      try {
        const result = await withTimeout(callAI(text, tasks, myName), 10_000)
        if (result.type === 'update') {
          setTasks(prev => prev.map(t => t.id === result.taskId ? { ...t, ...result.changes } : t))
          await api.update(result.taskId, result.changes).catch(() => {})
          setFeedback('Task updated')
          setTimeout(() => setFeedback(''), 2500)
        }
      } catch { /* timeout or AI failure — silently ignore */ }
      setParsing(false)
      inputRef.current?.focus()
      return
    }

    // New task — add immediately, AI enriches in background (no spinner)
    const id = crypto.randomUUID()
    const raw: Task = {
      id, title: text, dueDate: offsetDate(1),
      completed: false, isEvent: false, tags: [], who: myName,
      createdAt: new Date().toISOString(),
    }
    setTasks(prev => [raw, ...prev])
    inputRef.current?.focus()
    await api.create(raw).catch(() => {})

    // AI enrichment — silent background, 12s timeout
    withTimeout(callAI(text, tasks, myName), 12_000)
      .then(async result => {
        if (result.type !== 'add') return
        const enriched = {
          title:   result.title,
          dueDate: result.dueDate ?? offsetDate(1),
          isEvent: result.isEvent,
          tags:    result.tags ?? [],
          who:     result.who ?? myName,
        }
        setTasks(prev => prev.map(t => t.id === id ? { ...t, ...enriched } : t))
        await api.update(id, enriched).catch(() => {})
      })
      .catch(() => { /* AI unavailable — task stays as raw text, that's fine */ })
  }

  const toggle = async (id: string) => {
    const task = tasks.find(t => t.id === id); if (!task) return
    const changes = { completed: !task.completed, completedAt: !task.completed ? new Date().toISOString() : undefined }
    setTasks(prev => prev.map(t => t.id === id ? { ...t, ...changes } : t))
    await api.update(id, changes).catch(() => {})
  }
  const remove = async (id: string) => {
    setTasks(prev => prev.filter(t => t.id !== id))
    await api.remove(id).catch(() => {})
  }
  const reschedule = async (id: string, d: string) => {
    setTasks(prev => prev.map(t => t.id === id ? { ...t, dueDate: d } : t))
    await api.update(id, { dueDate: d }).catch(() => {})
  }

  // ── filtering ───────────────────────────────────────────────────────────────
  const today = todayStr()
  const byTab = [
    tasks.filter(x => !x.completed && x.dueDate <= today),  // Today / overdue
    tasks.filter(x => !x.completed && x.dueDate > today),   // Upcoming
    tasks.filter(x => !x.completed),                         // All
    tasks.filter(x =>  x.completed),                         // Done
  ]
  const counts   = byTab.map(a => a.length)
  const filtered = tagFilter ? byTab[tab].filter(x => x.tags.includes(tagFilter)) : byTab[tab]
  const allTags  = [...new Set(tasks.flatMap(t => t.tags))].sort()

  // today summary by person
  const todayPeople = byTab[0].reduce<Record<string, number>>((acc, t) => {
    acc[t.who] = (acc[t.who] ?? 0) + 1; return acc
  }, {})

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Tasks &amp; Events</Typography>
          <Typography variant="body2" color="text.secondary">
            Add tasks or say "move dentist to Friday" — shared across all devices.
          </Typography>
        </Box>
        <Tooltip title="Change your name">
          <Chip
            icon={<PersonIcon sx={{ fontSize: '14px !important' }} />}
            label={myName || 'Set name'}
            size="small" onClick={() => { setNameInput(myName); setNameDialog(true) }}
            sx={{ cursor: 'pointer', bgcolor: myName ? `${whoColor(myName)}18` : 'rgba(255,255,255,0.06)',
              color: myName ? whoColor(myName) : 'text.secondary',
              border: `1px solid ${myName ? whoColor(myName) + '40' : 'rgba(255,255,255,0.1)'}`,
              '&:hover': { bgcolor: myName ? `${whoColor(myName)}30` : 'rgba(255,255,255,0.1)' },
            }}
          />
        </Tooltip>
      </Box>

      {/* Today people summary */}
      {tab === 0 && Object.keys(todayPeople).length > 0 && (
        <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
          {Object.entries(todayPeople).map(([name, count]) => (
            <Box key={name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.6, borderRadius: 2, bgcolor: `${whoColor(name)}10`, border: `1px solid ${whoColor(name)}28` }}>
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: whoColor(name), flexShrink: 0 }} />
              <Typography sx={{ fontSize: 12, fontWeight: 600, color: whoColor(name) }}>{name}</Typography>
              <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{count} task{count !== 1 ? 's' : ''}</Typography>
            </Box>
          ))}
        </Box>
      )}

      {/* AI input */}
      <Box sx={{ display: 'flex', gap: 1, mb: feedback ? 0.5 : 2, alignItems: 'center' }}>
        <Box sx={{ position: 'relative', flex: 1 }}>
          <AutoAwesomeIcon sx={{ position: 'absolute', left: 12, top: '50%', transform: 'translateY(-50%)', zIndex: 1, fontSize: 18, color: 'primary.main', opacity: 0.7, pointerEvents: 'none' }} />
          <TextField inputRef={inputRef} fullWidth
            placeholder={`Try "dentist Thursday" or "Kate needs to call the school"`}
            value={input} onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }}
            disabled={parsing || !myName} size="small"
            sx={{ '& .MuiOutlinedInput-root': { pl: 5, borderRadius: 3, bgcolor: 'background.paper', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' }, '&.Mui-focused fieldset': { borderColor: 'primary.main' } } }}
          />
        </Box>
        <IconButton onClick={() => void submit()} disabled={!input.trim() || parsing || !myName}
          sx={{ bgcolor: 'primary.main', color: 'white', width: 40, height: 40, flexShrink: 0, borderRadius: 2.5, '&:hover': { bgcolor: '#4f52d9' }, '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.2)', color: 'rgba(255,255,255,0.3)' } }}
        >
          {parsing ? <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <AddIcon />}
        </IconButton>
      </Box>

      {feedback && <Typography variant="caption" sx={{ color: '#22c55e', pl: 0.5, display: 'block', mb: 1.5 }}>✓ {feedback}</Typography>}
      {error    && <Typography variant="caption" sx={{ color: '#ef4444', pl: 0.5, display: 'block', mb: 1.5 }}>{error}</Typography>}

      {/* Tag filter */}
      {allTags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
          {allTags.map(tag => (
            <Chip key={tag} label={tag} size="small" onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              sx={{ height: 22, fontSize: 11, cursor: 'pointer',
                bgcolor: tagFilter === tag ? `${tagColor(tag)}28` : 'rgba(255,255,255,0.04)',
                color:   tagFilter === tag ? tagColor(tag) : 'text.secondary',
                border:  `1px solid ${tagFilter === tag ? tagColor(tag) + '50' : 'rgba(255,255,255,0.08)'}`,
                '&:hover': { bgcolor: `${tagColor(tag)}18`, color: tagColor(tag) },
                '& .MuiChip-label': { px: 1 },
              }}
            />
          ))}
        </Box>
      )}

      {/* Tabs */}
      <Tabs value={tab} onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 2, minHeight: 36, borderBottom: '1px solid rgba(255,255,255,0.06)', '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}
      >
        {['Today', 'Upcoming', 'All', 'Done'].map((label, i) => (
          <Tab key={label}
            label={
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
                <span>{label}</span>
                {counts[i] > 0 && (
                  <Box sx={{ px: 0.75, lineHeight: '16px', bgcolor: i === tab ? 'primary.main' : 'rgba(255,255,255,0.08)', borderRadius: 10, fontSize: 10, fontWeight: 700, color: i === tab ? 'white' : 'text.secondary' }}>
                    {counts[i]}
                  </Box>
                )}
              </Box>
            }
            sx={{ minHeight: 36, py: 0.75, fontSize: 13, textTransform: 'none', color: 'text.secondary', '&.Mui-selected': { color: 'white' } }}
          />
        ))}
      </Tabs>

      {/* List */}
      {loading ? (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 6 }}>
          <CircularProgress size={28} sx={{ color: 'primary.main' }} />
        </Box>
      ) : filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 7, color: 'text.disabled' }}>
          <CheckCircleOutlinedIcon sx={{ fontSize: 44, mb: 1, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            {tab === 3 ? 'Nothing completed yet'
              : tab === 0 ? 'Nothing due today — all clear'
              : tagFilter ? `No ${tagFilter} tasks here`
              : 'Nothing here yet'}
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {filtered.map(task => (
            <TaskRow key={task.id} task={task}
              onToggle={() => void toggle(task.id)}
              onDelete={() => void remove(task.id)}
              onReschedule={d => void reschedule(task.id, d)}
            />
          ))}
        </List>
      )}

      {/* Name setup dialog */}
      <Dialog open={nameDialog} onClose={() => myName && setNameDialog(false)} maxWidth="xs" fullWidth
        slotProps={{ paper: { sx: { bgcolor: '#0f0f1a', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', backgroundImage: 'none' } } }}
      >
        <DialogTitle sx={{ fontWeight: 700 }}>Who are you on this device?</DialogTitle>
        <DialogContent>
          <Typography variant="body2" color="text.secondary" sx={{ mb: 2 }}>
            This lets you and your wife see whose tasks are whose. Set it once per device.
          </Typography>
          <TextField autoFocus fullWidth placeholder="e.g. Adam or Kate"
            value={nameInput} onChange={e => setNameInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') saveName() }}
            sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2, '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&.Mui-focused fieldset': { borderColor: 'primary.main' } } }}
          />
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          {myName && <Button onClick={() => setNameDialog(false)} sx={{ color: 'text.secondary' }}>Cancel</Button>}
          <Button onClick={saveName} disabled={!nameInput.trim()} variant="contained"
            sx={{ borderRadius: 2, bgcolor: 'primary.main', '&:hover': { bgcolor: '#4f52d9' } }}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  )
}
