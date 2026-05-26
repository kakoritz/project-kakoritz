import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Card, CardContent,
  Chip, Alert, Skeleton, IconButton, Tooltip,
} from '@mui/material'
import EmailIcon from '@mui/icons-material/Email'
import ReplyIcon from '@mui/icons-material/Reply'
import MarkEmailUnreadIcon from '@mui/icons-material/MarkEmailUnread'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'
import RefreshIcon from '@mui/icons-material/Refresh'
import AutoAwesomeIcon from '@mui/icons-material/AutoAwesome'

// ── Types ─────────────────────────────────────────────────────────────────────

interface Message {
  id: string
  from: string
  subject: string
  preview: string
  receivedAt: string
  isRead: boolean
  needsReply: boolean
  ageHours: number
  folder: string
}

interface Draft {
  id: string
  to: string
  subject: string
  body: string
  createdAt: string
  aiGenerated: boolean
}

// ── Stub data ─────────────────────────────────────────────────────────────────

const INBOX: Message[]   = []
const NEEDS_REPLY: Message[] = []
const DRAFTS: Draft[]    = []

// ── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// ── Shared components ─────────────────────────────────────────────────────────

function SetupAlert() {
  return (
    <Alert
      severity="info"
      icon={<WarningAmberIcon />}
      sx={{ mb: 3, borderRadius: 2 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>Azure app registration required</Typography>
      <Typography variant="caption" color="text.secondary">
        Register a free Azure app → grant Mail.ReadWrite + Mail.Send → paste refresh token into server env. Then live inbox data appears here.
      </Typography>
    </Alert>
  )
}

function EmptyState({ icon, label, sub }: { icon: React.ReactNode; label: string; sub?: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
      <Box sx={{ mb: 1.5, '& svg': { fontSize: 48, opacity: 0.25 } }}>{icon}</Box>
      <Typography variant="body2">{label}</Typography>
      {sub && <Typography variant="caption" sx={{ opacity: 0.55, display: 'block', mt: 0.5 }}>{sub}</Typography>}
    </Box>
  )
}

function MessageRow({ msg }: { msg: Message }) {
  const urgent = msg.ageHours >= 24 && msg.needsReply
  return (
    <Card sx={{
      bgcolor: 'background.paper', borderRadius: 2,
      border: `1px solid ${urgent ? 'rgba(239,68,68,0.4)' : msg.isRead ? 'rgba(255,255,255,0.06)' : 'rgba(99,102,241,0.35)'}`,
      transition: 'border-color 0.15s',
      '&:hover': { borderColor: 'primary.main' },
    }}>
      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            {!msg.isRead && (
              <Box sx={{ width: 7, height: 7, borderRadius: '50%', bgcolor: '#6366f1', flexShrink: 0 }} />
            )}
            <Typography sx={{ fontWeight: msg.isRead ? 500 : 700, fontSize: 13 }}>{msg.from}</Typography>
          </Box>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            {urgent && (
              <Chip label=">24h" size="small"
                sx={{ height: 18, fontSize: 9, bgcolor: 'rgba(239,68,68,0.15)', color: '#ef4444', fontWeight: 700 }} />
            )}
            <Typography variant="caption" color="text.secondary" sx={{ fontSize: 10 }}>
              {msg.receivedAt}
            </Typography>
          </Box>
        </Box>
        <Typography sx={{ fontSize: 13, fontWeight: msg.isRead ? 400 : 600, mb: 0.5 }}>{msg.subject}</Typography>
        <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.4 }}>{msg.preview}</Typography>
        <Box sx={{ display: 'flex', gap: 0.75, mt: 1 }}>
          {msg.needsReply && (
            <Chip icon={<ReplyIcon sx={{ fontSize: '12px !important' }} />} label="Needs reply" size="small"
              sx={{ height: 20, fontSize: 9, bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }} />
          )}
          <Tooltip title="Auto-draft reply with Claude">
            <Chip icon={<AutoAwesomeIcon sx={{ fontSize: '12px !important' }} />} label="Draft reply" size="small"
              sx={{ height: 20, fontSize: 9, cursor: 'pointer', bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b',
                '&:hover': { bgcolor: 'rgba(245,158,11,0.2)' } }} />
          </Tooltip>
        </Box>
      </CardContent>
    </Card>
  )
}

// ── Tabs ─────────────────────────────────────────────────────────────────────

function InboxTab({ loading }: { loading: boolean }) {
  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={90} />)}
    </Box>
  )
  if (!INBOX.length) return (
    <EmptyState icon={<EmailIcon />} label="Inbox empty" sub="Will show recent messages once Azure app is configured" />
  )
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {INBOX.map(m => <MessageRow key={m.id} msg={m} />)}
    </Box>
  )
}

function NeedsReplyTab({ loading }: { loading: boolean }) {
  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2].map(i => <Skeleton key={i} variant="rounded" height={90} />)}
    </Box>
  )
  if (!NEEDS_REPLY.length) return (
    <EmptyState
      icon={<MarkEmailUnreadIcon />}
      label="No threads needing a reply"
      sub="Threads with no outgoing reply in 24h appear here"
    />
  )
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {NEEDS_REPLY.map(m => <MessageRow key={m.id} msg={m} />)}
    </Box>
  )
}

function DraftsTab({ loading }: { loading: boolean }) {
  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1].map(i => <Skeleton key={i} variant="rounded" height={120} />)}
    </Box>
  )
  if (!DRAFTS.length) return (
    <EmptyState
      icon={<AutoAwesomeIcon />}
      label="No auto-drafts yet"
      sub="Claude will draft replies here for your review before sending"
    />
  )
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {DRAFTS.map(d => (
        <Card key={d.id} sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid rgba(245,158,11,0.25)' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontSize: 13, fontWeight: 600 }}>To: {d.to}</Typography>
              {d.aiGenerated && (
                <Chip icon={<AutoAwesomeIcon sx={{ fontSize: '12px !important' }} />} label="AI draft" size="small"
                  sx={{ height: 20, fontSize: 9, bgcolor: 'rgba(245,158,11,0.12)', color: '#f59e0b' }} />
              )}
            </Box>
            <Typography sx={{ fontSize: 13, mb: 0.75, color: 'text.secondary' }}>{d.subject}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ lineHeight: 1.5 }}>{d.body}</Typography>
            <Box sx={{ display: 'flex', gap: 0.75, mt: 1.5 }}>
              <Chip label="Send" size="small"
                sx={{ height: 22, fontSize: 10, cursor: 'pointer', bgcolor: 'rgba(34,197,94,0.15)', color: '#22c55e',
                  '&:hover': { bgcolor: 'rgba(34,197,94,0.25)' } }} />
              <Chip label="Edit" size="small"
                sx={{ height: 22, fontSize: 10, cursor: 'pointer', bgcolor: 'rgba(99,102,241,0.1)', color: '#a5b4fc',
                  '&:hover': { bgcolor: 'rgba(99,102,241,0.2)' } }} />
              <Chip label="Discard" size="small"
                sx={{ height: 22, fontSize: 10, cursor: 'pointer', bgcolor: 'rgba(239,68,68,0.08)', color: '#f87171',
                  '&:hover': { bgcolor: 'rgba(239,68,68,0.15)' } }} />
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Outlook() {
  const [tab, setTab] = useState(0)
  const loading = false

  const unreadCount  = INBOX.filter(m => !m.isRead).length
  const urgentCount  = NEEDS_REPLY.filter(m => m.ageHours >= 24).length

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{
          p: 0.75, borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(0,120,212,0.25) 0%, rgba(0,120,212,0.08) 100%)',
          border: '1px solid rgba(0,120,212,0.3)',
          display: 'flex',
        }}>
          <EmailIcon sx={{ color: '#0078d4', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Outlook</Typography>
          <Typography variant="caption" color="text.secondary">adam@adamscottspiker.org</Typography>
        </Box>
        <Box sx={{ ml: 'auto', display: 'flex', alignItems: 'center', gap: 1 }}>
          <Chip label="Not configured" size="small"
            sx={{ bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }} />
          <Tooltip title="Refresh inbox">
            <span>
              <IconButton size="small" disabled>
                <RefreshIcon sx={{ fontSize: 16 }} />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Box>

      <SetupAlert />

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Chip icon={<EmailIcon sx={{ fontSize: 15 }} />}
          label={`${unreadCount} unread`} size="small"
          sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }} />
        <Chip icon={<ReplyIcon sx={{ fontSize: 15 }} />}
          label={`${urgentCount} overdue replies`} size="small"
          sx={{ bgcolor: urgentCount > 0 ? 'rgba(239,68,68,0.12)' : 'rgba(99,102,241,0.12)',
            color: urgentCount > 0 ? '#ef4444' : '#a5b4fc' }} />
        <Chip icon={<AutoAwesomeIcon sx={{ fontSize: 15 }} />}
          label={`${DRAFTS.length} AI drafts ready`} size="small"
          sx={{ bgcolor: 'rgba(245,158,11,0.1)', color: '#f59e0b' }} />
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)', mb: 0,
          '& .MuiTabs-indicator': { bgcolor: '#0078d4' },
          '& .Mui-selected': { color: '#0078d4 !important' },
        }}
      >
        <Tab label="Inbox" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label={urgentCount > 0 ? `Needs Reply (${urgentCount})` : 'Needs Reply'}
          sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label={DRAFTS.length > 0 ? `Drafts (${DRAFTS.length})` : 'Drafts'}
          sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      <TabPanel value={tab} index={0}><InboxTab loading={loading} /></TabPanel>
      <TabPanel value={tab} index={1}><NeedsReplyTab loading={loading} /></TabPanel>
      <TabPanel value={tab} index={2}><DraftsTab loading={loading} /></TabPanel>
    </Box>
  )
}
