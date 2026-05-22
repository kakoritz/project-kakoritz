import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, TextField, IconButton, Chip, Tabs, Tab,
  List, ListItem, Checkbox, CircularProgress, Tooltip,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline'

const STORAGE_KEY = 'kakoritz_tasks'
const CLAUDE_API = 'http://192.168.1.251:8587'

interface Task {
  id: string
  title: string
  dueDate?: string   // YYYY-MM-DD
  completed: boolean
  completedAt?: string
  isEvent: boolean
  createdAt: string
}

function todayStr(): string {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysUntil(dateStr: string): number {
  const t = new Date(todayStr() + 'T00:00:00').getTime()
  const d = new Date(dateStr + 'T00:00:00').getTime()
  return Math.round((d - t) / 86_400_000)
}

function dueBadge(task: Task): { label: string; color: string } | null {
  if (!task.dueDate) return null
  const days = daysUntil(task.dueDate)
  if (days < 0)   return { label: `${Math.abs(days)}d overdue`, color: '#ef4444' }
  if (days === 0) return { label: 'Today', color: '#f59e0b' }
  if (days === 1) return { label: 'Tomorrow', color: '#38bdf8' }
  if (days <= 7)  return { label: `in ${days}d`, color: '#6366f1' }
  const d = new Date(task.dueDate + 'T00:00:00')
  const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  return { label: task.isEvent ? `${label} · in ${days}d` : label, color: task.isEvent ? '#a78bfa' : 'rgba(255,255,255,0.4)' }
}

async function parseWithAI(input: string): Promise<Partial<Task>> {
  const t = todayStr()
  const prompt = `Today is ${t}. Parse this task or event into JSON only — no markdown, no explanation. Schema: {"title":string,"dueDate":"YYYY-MM-DD or null","isEvent":boolean}. isEvent=true for birthdays, anniversaries, holidays, or recurring events. Input: ${input}`

  const res = await fetch(`${CLAUDE_API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
  })

  if (!res.ok || !res.body) throw new Error('API error')

  const reader = res.body.getReader()
  const dec = new TextDecoder()
  let buf = '', full = ''

  while (true) {
    const { done, value } = await reader.read()
    if (done) break
    buf += dec.decode(value, { stream: true })
    const lines = buf.split('\n')
    buf = lines.pop() ?? ''
    for (const line of lines) {
      if (!line.startsWith('data: ')) continue
      const payload = line.slice(6)
      if (payload === '[DONE]') break
      try { const p = JSON.parse(payload); if (p.text) full += p.text } catch { /* skip */ }
    }
  }

  const match = full.match(/\{[\s\S]*?\}/)
  if (match) return JSON.parse(match[0]) as Partial<Task>
  throw new Error('Could not parse response')
}

function TaskRow({ task, onToggle, onDelete }: { task: Task; onToggle: () => void; onDelete: () => void }) {
  const badge = dueBadge(task)
  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <Box sx={{
        display: 'flex', alignItems: 'center', gap: 1, width: '100%',
        py: 1, px: 1.5, borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
      }}>
        <Checkbox
          checked={task.completed}
          onChange={onToggle}
          size="small"
          sx={{ p: 0.5, color: 'rgba(255,255,255,0.25)', '&.Mui-checked': { color: 'primary.main' } }}
        />
        <Typography sx={{
          flex: 1, fontSize: 14, lineHeight: 1.4, wordBreak: 'break-word',
          textDecoration: task.completed ? 'line-through' : 'none',
          color: task.completed ? 'text.disabled' : 'text.primary',
        }}>
          {task.isEvent ? '📅 ' : ''}{task.title}
        </Typography>
        {badge && (
          <Chip
            label={badge.label} size="small"
            sx={{ height: 20, fontSize: 11, fontWeight: 600, flexShrink: 0,
              bgcolor: `${badge.color}18`, color: badge.color,
              border: `1px solid ${badge.color}35`,
              '& .MuiChip-label': { px: 1 },
            }}
          />
        )}
        <Tooltip title="Delete">
          <IconButton size="small" onClick={onDelete}
            sx={{ p: 0.5, color: 'rgba(255,255,255,0.15)', '&:hover': { color: '#ef4444' } }}>
            <DeleteOutlineIcon sx={{ fontSize: 16 }} />
          </IconButton>
        </Tooltip>
      </Box>
    </ListItem>
  )
}

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as Task[] } catch { return [] }
  })
  const [input, setInput] = useState('')
  const [parsing, setParsing] = useState(false)
  const [tab, setTab] = useState(0)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const addTask = async () => {
    const text = input.trim()
    if (!text || parsing) return
    setInput('')
    setParsing(true)

    let parsed: Partial<Task> = {}
    try { parsed = await parseWithAI(text) } catch { parsed = { title: text } }

    setTasks(prev => [{
      id: Date.now().toString(),
      title: parsed.title ?? text,
      dueDate: parsed.dueDate ?? undefined,
      completed: false,
      isEvent: parsed.isEvent ?? false,
      createdAt: new Date().toISOString(),
    }, ...prev])
    setParsing(false)
    inputRef.current?.focus()
  }

  const toggle = (id: string) => setTasks(prev =>
    prev.map(t => t.id === id
      ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined }
      : t
    )
  )

  const remove = (id: string) => setTasks(prev => prev.filter(t => t.id !== id))

  const t = todayStr()
  const byTab = [
    tasks.filter(x => !x.completed),
    tasks.filter(x => !x.completed && !!x.dueDate && x.dueDate <= t),
    tasks.filter(x => !x.completed && !!x.dueDate && x.dueDate > t),
    tasks.filter(x => x.completed),
  ]
  const counts = byTab.map(arr => arr.length)
  const filtered = byTab[tab]

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>Tasks & Events</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Type anything — AI parses dates and details automatically.
      </Typography>

      {/* AI input */}
      <Box sx={{ display: 'flex', gap: 1, mb: 3, alignItems: 'center' }}>
        <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <AutoAwesomeIcon sx={{ position: 'absolute', left: 12, zIndex: 1, fontSize: 18, color: 'primary.main', opacity: 0.7, pointerEvents: 'none' }} />
          <TextField
            inputRef={inputRef}
            fullWidth
            placeholder={`Try "dentist Thursday" or "Sophia's birthday June 15"`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void addTask() } }}
            disabled={parsing}
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { pl: 5, borderRadius: 3, bgcolor: 'background.paper', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' }, '&.Mui-focused fieldset': { borderColor: 'primary.main' } } }}
          />
        </Box>
        <IconButton
          onClick={() => void addTask()}
          disabled={!input.trim() || parsing}
          sx={{ bgcolor: 'primary.main', color: 'white', width: 40, height: 40, flexShrink: 0, borderRadius: 2.5, '&:hover': { bgcolor: '#4f52d9' }, '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.2)', color: 'rgba(255,255,255,0.3)' } }}
        >
          {parsing
            ? <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.5)' }} />
            : <AddIcon />}
        </IconButton>
      </Box>

      {/* Tabs */}
      <Tabs
        value={tab} onChange={(_, v: number) => setTab(v)}
        sx={{ mb: 2, minHeight: 36, borderBottom: '1px solid rgba(255,255,255,0.06)', '& .MuiTabs-indicator': { bgcolor: 'primary.main' } }}
      >
        {['All', 'Due', 'Upcoming', 'Done'].map((label, i) => (
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
      {filtered.length === 0 ? (
        <Box sx={{ textAlign: 'center', py: 7, color: 'text.disabled' }}>
          <CheckCircleOutlineIcon sx={{ fontSize: 44, mb: 1, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            {tab === 3 ? 'Nothing completed yet' : 'All clear — add something above'}
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {filtered.map(task => (
            <TaskRow key={task.id} task={task} onToggle={() => toggle(task.id)} onDelete={() => remove(task.id)} />
          ))}
        </List>
      )}
    </Box>
  )
}
