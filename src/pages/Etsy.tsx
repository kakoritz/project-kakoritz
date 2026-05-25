import { useState } from 'react'
import {
  Box, Typography, Tabs, Tab, Card, CardContent,
  Chip, Alert, Skeleton,
} from '@mui/material'
import ShoppingBagIcon from '@mui/icons-material/ShoppingBag'
import EmailIcon from '@mui/icons-material/Email'
import InventoryIcon from '@mui/icons-material/Inventory'
import WarningAmberIcon from '@mui/icons-material/WarningAmber'

// ── Stub data (replace when OAuth is approved) ──────────────────────────────

const PENDING_ORDERS: {
  id: string; buyer: string; item: string; total: string; age: string; status: 'new' | 'processing' | 'shipped'
}[] = []

const PENDING_MESSAGES: {
  id: string; from: string; subject: string; preview: string; age: string; unread: boolean
}[] = []

// ── Tab panel ────────────────────────────────────────────────────────────────

function TabPanel({ value, index, children }: { value: number; index: number; children: React.ReactNode }) {
  return value === index ? <Box sx={{ pt: 2 }}>{children}</Box> : null
}

// ── Reusable components ───────────────────────────────────────────────────────

function PendingAlert() {
  return (
    <Alert
      severity="warning"
      icon={<WarningAmberIcon />}
      sx={{ mb: 3, borderRadius: 2 }}
    >
      <Typography variant="body2" sx={{ fontWeight: 600 }}>
        Etsy OAuth pending approval
      </Typography>
      <Typography variant="caption" color="text.secondary">
        API credentials are configured. Once Etsy approves your app, live orders and messages will appear here automatically.
      </Typography>
    </Alert>
  )
}

function EmptyState({ icon, label }: { icon: React.ReactNode; label: string }) {
  return (
    <Box sx={{ textAlign: 'center', py: 8, color: 'text.secondary' }}>
      <Box sx={{ mb: 1.5, '& svg': { fontSize: 48, opacity: 0.3 } }}>{icon}</Box>
      <Typography variant="body2">{label}</Typography>
    </Box>
  )
}

// ── Orders tab ───────────────────────────────────────────────────────────────

function OrdersTab({ loading }: { loading: boolean }) {
  const orders = PENDING_ORDERS

  const statusColor = (s: typeof orders[0]['status']) =>
    s === 'new' ? '#ef4444' : s === 'processing' ? '#f59e0b' : '#22c55e'

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2, 3].map(i => <Skeleton key={i} variant="rounded" height={72} />)}
    </Box>
  )

  if (!orders.length) return (
    <EmptyState icon={<InventoryIcon />} label="No open orders" />
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {orders.map(o => (
        <Card key={o.id} sx={{ bgcolor: 'background.paper', borderRadius: 2, border: '1px solid rgba(255,255,255,0.06)' }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <Box>
                <Typography sx={{ fontWeight: 600, fontSize: 14 }}>{o.item}</Typography>
                <Typography variant="caption" color="text.secondary">from {o.buyer} · {o.age}</Typography>
              </Box>
              <Box sx={{ textAlign: 'right' }}>
                <Typography sx={{ fontWeight: 700, color: '#22c55e', fontSize: 14 }}>{o.total}</Typography>
                <Chip
                  label={o.status}
                  size="small"
                  sx={{ mt: 0.5, bgcolor: `${statusColor(o.status)}20`, color: statusColor(o.status), fontWeight: 600, fontSize: 10 }}
                />
              </Box>
            </Box>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

// ── Messages tab ─────────────────────────────────────────────────────────────

function MessagesTab({ loading }: { loading: boolean }) {
  const msgs = PENDING_MESSAGES

  if (loading) return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {[1, 2].map(i => <Skeleton key={i} variant="rounded" height={80} />)}
    </Box>
  )

  if (!msgs.length) return (
    <EmptyState icon={<EmailIcon />} label="No pending messages" />
  )

  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5 }}>
      {msgs.map(m => (
        <Card key={m.id} sx={{
          bgcolor: 'background.paper', borderRadius: 2,
          border: `1px solid ${m.unread ? 'rgba(99,102,241,0.35)' : 'rgba(255,255,255,0.06)'}`,
        }}>
          <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 0.5 }}>
              <Typography sx={{ fontWeight: m.unread ? 700 : 600, fontSize: 14 }}>{m.from}</Typography>
              <Typography variant="caption" color="text.secondary">{m.age}</Typography>
            </Box>
            <Typography sx={{ fontSize: 12, color: m.unread ? 'white' : 'text.secondary' }}>{m.subject}</Typography>
            <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>{m.preview}</Typography>
          </CardContent>
        </Card>
      ))}
    </Box>
  )
}

// ── Page ─────────────────────────────────────────────────────────────────────

export default function Etsy() {
  const [tab, setTab] = useState(0)
  const loading = false

  const unreadCount = PENDING_MESSAGES.filter(m => m.unread).length

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, mb: 1 }}>
        <Box sx={{
          p: 0.75, borderRadius: 2,
          background: 'linear-gradient(135deg, rgba(249,115,22,0.25) 0%, rgba(249,115,22,0.08) 100%)',
          border: '1px solid rgba(249,115,22,0.3)',
          display: 'flex',
        }}>
          <ShoppingBagIcon sx={{ color: '#f97316', fontSize: 22 }} />
        </Box>
        <Box>
          <Typography variant="h5" sx={{ fontWeight: 700, lineHeight: 1.2 }}>Etsy</Typography>
          <Typography variant="caption" color="text.secondary">Orders &amp; Messages</Typography>
        </Box>
        <Chip
          label="Pending approval"
          size="small"
          sx={{ ml: 'auto', bgcolor: 'rgba(245,158,11,0.15)', color: '#f59e0b', fontWeight: 600 }}
        />
      </Box>

      <PendingAlert />

      {/* Summary chips */}
      <Box sx={{ display: 'flex', gap: 1.5, mb: 2.5, flexWrap: 'wrap' }}>
        <Chip
          icon={<InventoryIcon sx={{ fontSize: 15 }} />}
          label={`${PENDING_ORDERS.length} open orders`}
          size="small"
          sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}
        />
        <Chip
          icon={<EmailIcon sx={{ fontSize: 15 }} />}
          label={`${unreadCount} unread messages`}
          size="small"
          sx={{ bgcolor: 'rgba(99,102,241,0.12)', color: '#a5b4fc' }}
        />
      </Box>

      <Tabs
        value={tab}
        onChange={(_, v) => setTab(v)}
        sx={{
          borderBottom: '1px solid rgba(255,255,255,0.08)', mb: 0,
          '& .MuiTabs-indicator': { bgcolor: '#f97316' },
          '& .Mui-selected': { color: '#f97316 !important' },
        }}
      >
        <Tab label="Orders" sx={{ textTransform: 'none', fontWeight: 600 }} />
        <Tab label="Messages" sx={{ textTransform: 'none', fontWeight: 600 }} />
      </Tabs>

      <TabPanel value={tab} index={0}><OrdersTab loading={loading} /></TabPanel>
      <TabPanel value={tab} index={1}><MessagesTab loading={loading} /></TabPanel>
    </Box>
  )
}
