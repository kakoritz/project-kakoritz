import { useState, useEffect, useRef } from 'react'
import {
  Box, Typography, TextField, IconButton, Chip, Tabs, Tab,
  List, ListItem, Checkbox, CircularProgress, Tooltip, Popover, Button,
} from '@mui/material'
import AddIcon from '@mui/icons-material/Add'
import DeleteOutlineIcon from '@mui/icons-material/DeleteOutlined'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'
import CheckCircleOutlinedIcon from '@mui/icons-material/CheckCircleOutlined'

const STORAGE_KEY = 'kakoritz_tasks'
const CLAUDE_API  = 'http://192.168.1.251:8587'

const TAG_COLORS: Record<string, string> = {
  work:     '#6366f1',
  personal: '#22c55e',
  health:   '#ef4444',
  finance:  '#f59e0b',
  family:   '#a78bfa',
  home:     '#fb923c',
  errands:  '#84cc16',
  bills:    '#f59e0b',
}
const tagColor = (tag: string) => TAG_COLORS[tag.toLowerCase()] ?? 'rgba(255,255,255,0.35)'

interface Task {
  id: string
  title: string
  dueDate: string       // always set — defaults to tomorrow
  completed: boolean
  completedAt?: string
  isEvent: boolean
  tags: string[]
  createdAt: string
}

type AIResult =
  | { type: 'add';    title: string; dueDate: string | null; isEvent: boolean; tags: string[] }
  | { type: 'update'; taskId: string; changes: { dueDate?: string; tags?: string[] } }
  | { type: 'unknown' }

function todayStr() {
  const d = new Date()
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function offsetDate(days: number) {
  const d = new Date()
  d.setDate(d.getDate() + days)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function daysUntil(dateStr: string) {
  const t = new Date(todayStr() + 'T00:00:00').getTime()
  const d = new Date(dateStr  + 'T00:00:00').getTime()
  return Math.round((d - t) / 86_400_000)
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

function normalize(t: any): Task {
  return { ...t, tags: t.tags ?? [], dueDate: (t.dueDate && t.dueDate !== 'null') ? t.dueDate : offsetDate(1) }
}

async function callAI(input: string, tasks: Task[]): Promise<AIResult> {
  const today    = todayStr()
  const tomorrow = offsetDate(1)
  const taskList = tasks.slice(0, 30).map(t =>
    `id:${t.id} "${t.title}" due:${t.dueDate} tags:[${t.tags.join(',')}]`
  ).join('\n')

  const prompt =
`Today is ${today}, tomorrow is ${tomorrow}.
You manage a task list. The input is EITHER a new task/event OR a command to modify an existing task.

Existing tasks:
${taskList || '(none)'}

Valid tags (pick 1-2 most relevant): work, personal, health, finance, family, home, errands, bills

Return ONLY one JSON object — no markdown, no explanation:
• New task:    {"type":"add","title":"...","dueDate":"YYYY-MM-DD","isEvent":false,"tags":["..."]}
  – Default dueDate to ${tomorrow} when not mentioned
  – isEvent=true for birthdays, anniversaries, holidays
• Modify task: {"type":"update","taskId":"exact-id","changes":{"dueDate":"YYYY-MM-DD"}}
• Unclear:     {"type":"unknown"}

Input: ${input}`

  const res = await fetch(`${CLAUDE_API}/api/chat`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: prompt }] }),
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
      const p = line.slice(6)
      if (p === '[DONE]') break
      try { const j = JSON.parse(p); if (j.text) full += j.text } catch { /* skip */ }
    }
  }

  const s = full.indexOf('{'), e = full.lastIndexOf('}')
  if (s !== -1 && e !== -1) return JSON.parse(full.slice(s, e + 1)) as AIResult
  return { type: 'unknown' }
}

// ── Date quick-picker popover ─────────────────────────────────────────────────

function DatePopover({ anchorEl, onClose, onSelect }: {
  anchorEl: HTMLElement | null
  onClose: () => void
  onSelect: (d: string) => void
}) {
  const [custom, setCustom] = useState('')
  const presets = [
    { label: 'Today',     d: offsetDate(0) },
    { label: 'Tomorrow',  d: offsetDate(1) },
    { label: 'In 3 days', d: offsetDate(3) },
    { label: 'Next week', d: offsetDate(7) },
  ]
  return (
    <Popover
      open={Boolean(anchorEl)} anchorEl={anchorEl} onClose={onClose}
      anchorOrigin={{ vertical: 'bottom', horizontal: 'left' }}
      slotProps={{ paper: { sx: { bgcolor: '#13131f', border: '1px solid rgba(255,255,255,0.08)', borderRadius: 2, backgroundImage: 'none', minWidth: 150 } } }}
    >
      <Box sx={{ p: 1 }}>
        {presets.map(p => (
          <Button key={p.label} fullWidth size="small"
            onClick={() => { onSelect(p.d); onClose() }}
            sx={{ justifyContent: 'flex-start', color: 'text.secondary', py: 0.5, fontSize: 13, borderRadius: 1.5, '&:hover': { color: 'white', bgcolor: 'rgba(255,255,255,0.06)' } }}
          >
            {p.label}
          </Button>
        ))}
        <Box sx={{ mt: 0.5, pt: 0.75, borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          <TextField
            type="date" size="small" fullWidth value={custom}
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
  task: Task
  onToggle: () => void
  onDelete: () => void
  onReschedule: (d: string) => void
}) {
  const [anchor, setAnchor] = useState<HTMLElement | null>(null)
  const badge = dueBadge(task.dueDate, task.isEvent)

  return (
    <ListItem disablePadding sx={{ mb: 0.5 }}>
      <Box sx={{
        display: 'flex', flexDirection: 'column', width: '100%',
        py: 1, px: 1.5, borderRadius: 2,
        bgcolor: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.04)',
        transition: 'background 0.15s',
        '&:hover': { bgcolor: 'rgba(255,255,255,0.04)' },
      }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <Checkbox
            checked={task.completed} onChange={onToggle} size="small"
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
            <Chip
              label={badge.label} size="small"
              onClick={e => setAnchor(e.currentTarget)}
              sx={{ height: 20, fontSize: 11, fontWeight: 600, flexShrink: 0, cursor: 'pointer',
                bgcolor: `${badge.color}18`, color: badge.color, border: `1px solid ${badge.color}35`,
                '& .MuiChip-label': { px: 1 },
                '&:hover': { bgcolor: `${badge.color}30` },
              }}
            />
          </Tooltip>
          <Tooltip title="Delete">
            <IconButton size="small" onClick={onDelete}
              sx={{ p: 0.5, color: 'rgba(255,255,255,0.15)', '&:hover': { color: '#ef4444' } }}>
              <DeleteOutlineIcon sx={{ fontSize: 16 }} />
            </IconButton>
          </Tooltip>
        </Box>

        {task.tags.length > 0 && (
          <Box sx={{ display: 'flex', gap: 0.5, pl: 4.5, mt: 0.5, flexWrap: 'wrap' }}>
            {task.tags.map(tag => (
              <Chip key={tag} label={tag} size="small"
                sx={{ height: 16, fontSize: 10,
                  bgcolor: `${tagColor(tag)}15`, color: tagColor(tag),
                  border: `1px solid ${tagColor(tag)}30`,
                  '& .MuiChip-label': { px: 0.75 },
                }}
              />
            ))}
          </Box>
        )}

        <DatePopover anchorEl={anchor} onClose={() => setAnchor(null)} onSelect={onReschedule} />
      </Box>
    </ListItem>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Tasks() {
  const [tasks, setTasks] = useState<Task[]>(() => {
    try { return (JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as any[]).map(normalize) }
    catch { return [] }
  })
  const [input,    setInput]    = useState('')
  const [parsing,  setParsing]  = useState(false)
  const [feedback, setFeedback] = useState('')
  const [tab,      setTab]      = useState(0)
  const [tagFilter,setTagFilter]= useState<string | null>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks))
  }, [tasks])

  const allTags = [...new Set(tasks.flatMap(t => t.tags))].sort()

  const submit = async () => {
    const text = input.trim()
    if (!text || parsing) return
    setInput(''); setParsing(true); setFeedback('')

    try {
      const result = await callAI(text, tasks)

      if (result.type === 'add') {
        setTasks(prev => [{
          id: Date.now().toString(),
          title: result.title,
          dueDate: result.dueDate ?? offsetDate(1),
          completed: false,
          isEvent: result.isEvent,
          tags: result.tags ?? [],
          createdAt: new Date().toISOString(),
        }, ...prev])
      } else if (result.type === 'update') {
        setTasks(prev => prev.map(t => t.id === result.taskId ? { ...t, ...result.changes } : t))
        setFeedback('Task updated')
        setTimeout(() => setFeedback(''), 2500)
      } else {
        setTasks(prev => [{
          id: Date.now().toString(),
          title: text,
          dueDate: offsetDate(1),
          completed: false,
          isEvent: false,
          tags: [],
          createdAt: new Date().toISOString(),
        }, ...prev])
      }
    } catch {
      setTasks(prev => [{
        id: Date.now().toString(),
        title: text,
        dueDate: offsetDate(1),
        completed: false,
        isEvent: false,
        tags: [],
        createdAt: new Date().toISOString(),
      }, ...prev])
    }

    setParsing(false)
    inputRef.current?.focus()
  }

  const toggle     = (id: string) => setTasks(prev =>
    prev.map(t => t.id === id ? { ...t, completed: !t.completed, completedAt: !t.completed ? new Date().toISOString() : undefined } : t)
  )
  const remove     = (id: string)            => setTasks(prev => prev.filter(t => t.id !== id))
  const reschedule = (id: string, d: string) => setTasks(prev => prev.map(t => t.id === id ? { ...t, dueDate: d } : t))

  const today = todayStr()
  const byTab = [
    tasks.filter(x => !x.completed),
    tasks.filter(x => !x.completed && x.dueDate <= today),
    tasks.filter(x => !x.completed && x.dueDate > today),
    tasks.filter(x =>  x.completed),
  ]
  const counts   = byTab.map(a => a.length)
  const filtered = tagFilter ? byTab[tab].filter(x => x.tags.includes(tagFilter)) : byTab[tab]

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>Tasks &amp; Events</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>
        Add tasks or say things like "move dentist to Friday" — AI handles both.
      </Typography>

      {/* AI input */}
      <Box sx={{ display: 'flex', gap: 1, mb: feedback ? 0.5 : 2, alignItems: 'center' }}>
        <Box sx={{ position: 'relative', flex: 1, display: 'flex', alignItems: 'center' }}>
          <AutoAwesomeIcon sx={{ position: 'absolute', left: 12, zIndex: 1, fontSize: 18, color: 'primary.main', opacity: 0.7, pointerEvents: 'none' }} />
          <TextField
            inputRef={inputRef} fullWidth
            placeholder={`Try "dentist Thursday" or "move dentist to next week"`}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); void submit() } }}
            disabled={parsing}
            size="small"
            sx={{ '& .MuiOutlinedInput-root': { pl: 5, borderRadius: 3, bgcolor: 'background.paper', '& fieldset': { borderColor: 'rgba(255,255,255,0.1)' }, '&:hover fieldset': { borderColor: 'rgba(99,102,241,0.4)' }, '&.Mui-focused fieldset': { borderColor: 'primary.main' } } }}
          />
        </Box>
        <IconButton
          onClick={() => void submit()} disabled={!input.trim() || parsing}
          sx={{ bgcolor: 'primary.main', color: 'white', width: 40, height: 40, flexShrink: 0, borderRadius: 2.5, '&:hover': { bgcolor: '#4f52d9' }, '&.Mui-disabled': { bgcolor: 'rgba(99,102,241,0.2)', color: 'rgba(255,255,255,0.3)' } }}
        >
          {parsing ? <CircularProgress size={16} sx={{ color: 'rgba(255,255,255,0.5)' }} /> : <AddIcon />}
        </IconButton>
      </Box>

      {feedback && (
        <Typography variant="caption" sx={{ color: '#22c55e', pl: 0.5, display: 'block', mb: 1.5 }}>
          ✓ {feedback}
        </Typography>
      )}

      {/* Tag filter pills */}
      {allTags.length > 0 && (
        <Box sx={{ display: 'flex', gap: 0.75, mb: 2, flexWrap: 'wrap' }}>
          {allTags.map(tag => (
            <Chip key={tag} label={tag} size="small"
              onClick={() => setTagFilter(tagFilter === tag ? null : tag)}
              sx={{
                height: 22, fontSize: 11, cursor: 'pointer',
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
          <CheckCircleOutlinedIcon sx={{ fontSize: 44, mb: 1, opacity: 0.4 }} />
          <Typography variant="body2" sx={{ opacity: 0.6 }}>
            {tab === 3 ? 'Nothing completed yet' : tagFilter ? `No ${tagFilter} tasks here` : 'All clear — add something above'}
          </Typography>
        </Box>
      ) : (
        <List disablePadding>
          {filtered.map(task => (
            <TaskRow key={task.id} task={task}
              onToggle={() => toggle(task.id)}
              onDelete={() => remove(task.id)}
              onReschedule={d => reschedule(task.id, d)}
            />
          ))}
        </List>
      )}
    </Box>
  )
}
