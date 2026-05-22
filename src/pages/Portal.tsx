import { useState } from 'react'
import {
  Grid, Card, CardContent, Typography, Box, IconButton,
  Dialog, DialogContent, DialogTitle, List, ListItem,
  ListItemButton, ListItemText,
} from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import CodeIcon from '@mui/icons-material/Code'
import RouterIcon from '@mui/icons-material/Router'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SecurityIcon from '@mui/icons-material/Security'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import EmailIcon from '@mui/icons-material/Email'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CloseIcon from '@mui/icons-material/Close'
import PlayCircleIcon from '@mui/icons-material/PlayCircle'
import MovieIcon from '@mui/icons-material/Movie'
import LiveTvIcon from '@mui/icons-material/LiveTv'
import AutoStoriesIcon from '@mui/icons-material/AutoStories'

// ── Data ─────────────────────────────────────────────────────────────────────

const APPS = [
  { name: 'Synology DSM',    desc: 'NAS',          url: 'http://192.168.1.251:5000',                             icon: <StorageIcon />,    color: '#6366f1' },
  { name: 'AdGuard Home',    desc: 'DNS',           url: 'http://192.168.1.251:3001',                             icon: <SecurityIcon />,   color: '#22c55e' },
  { name: 'Containers',      desc: 'Docker',        url: 'http://192.168.1.251:5000',                             icon: <Inventory2Icon />, color: '#38bdf8' },
  { name: 'Actions',         desc: 'GitHub CI',     url: 'https://github.com/kakoritz/project-kakoritz/actions', icon: <CodeIcon />,       color: '#a78bfa' },
  { name: 'Router',          desc: 'Network',       url: 'http://192.168.1.1',                                    icon: <RouterIcon />,     color: '#f59e0b' },
]

const STREAMING = [
  { name: 'YouTube',  desc: 'Video',       url: 'https://www.youtube.com',          icon: <PlayCircleIcon />, color: '#ef4444' },
  { name: 'Plex',     desc: 'Local Media', url: 'http://192.168.1.251:32400/web',   icon: <MovieIcon />,      color: '#e5a00d' },
  { name: 'Netflix',  desc: 'Streaming',   url: 'https://www.netflix.com',          icon: <LiveTvIcon />,     color: '#dc2626' },
  { name: 'Disney+',  desc: 'Streaming',   url: 'https://www.disneyplus.com',       icon: <AutoStoriesIcon />,color: '#3b82f6' },
]

const EMAIL_ACCOUNTS = [
  { label: 'Decked Out Games',         email: 'aspiker@deckedoutgames.com',        color: '#6366f1' },
  { label: 'Decked Out Publishing',    email: 'aspiker@deckedoutpublishing.com',   color: '#22c55e' },
  { label: 'Personal',                 email: 'adam@adamscottspiker.org',          color: '#38bdf8' },
  { label: 'Pander Hollow Ministries', email: 'support@panderhollowministries.org',color: '#f59e0b' },
]

const BANK_ACCOUNTS = [
  { label: 'PNC Bank',    url: 'https://www.pnc.com/',        color: '#f59e0b' },
  { label: 'Wells Fargo', url: 'https://www.wellsfargo.com/', color: '#dc2626' },
  { label: 'Venmo',       url: 'https://venmo.com/',          color: '#38bdf8' },
  { label: 'Cash App',    url: 'https://cash.app/',           color: '#22c55e' },
  { label: 'Chime',       url: 'https://www.chime.com/',      color: '#a78bfa' },
]

// ── Icon card ─────────────────────────────────────────────────────────────────

function IconCard({
  name, desc, color, icon, onClick, badge,
}: {
  name: string; desc: string; color: string
  icon: React.ReactNode; onClick: () => void; badge?: number
}) {
  return (
    <Card
      onClick={onClick}
      sx={{
        bgcolor: 'background.paper', borderRadius: 3,
        border: '1px solid rgba(255,255,255,0.06)',
        cursor: 'pointer',
        transition: 'transform 0.15s ease, box-shadow 0.2s ease, border-color 0.2s',
        '&:hover': {
          transform: 'translateY(-3px)',
          boxShadow: `0 10px 28px ${color}28`,
          borderColor: `${color}55`,
        },
        '&:active': { transform: 'scale(0.95)' },
      }}
    >
      <CardContent sx={{ p: { xs: 1.5, sm: 2 }, textAlign: 'center', '&:last-child': { pb: { xs: 1.5, sm: 2 } } }}>
        {/* Icon with optional badge */}
        <Box sx={{ position: 'relative', display: 'inline-flex', mb: 1 }}>
          <Box sx={{
            width: { xs: 52, sm: 60 }, height: { xs: 52, sm: 60 },
            borderRadius: 3,
            background: `linear-gradient(135deg, ${color}38 0%, ${color}18 100%)`,
            border: `1px solid ${color}38`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            color,
            '& svg': { fontSize: { xs: 26, sm: 30 } },
          }}>
            {icon}
          </Box>
          {badge !== undefined && (
            <Box sx={{
              position: 'absolute', top: -5, right: -6,
              bgcolor: color, color: 'white',
              borderRadius: 10, px: 0.75,
              fontSize: 10, fontWeight: 800, lineHeight: '18px',
              minWidth: 18, textAlign: 'center',
              border: '2px solid #0a0a14',
            }}>
              {badge}
            </Box>
          )}
        </Box>
        {/* Name */}
        <Typography sx={{
          fontWeight: 700, fontSize: { xs: 11, sm: 12 }, lineHeight: 1.25,
          display: 'block', mb: 0.25,
        }}>
          {name}
        </Typography>
        {/* Desc */}
        <Typography sx={{ fontSize: { xs: 10, sm: 11 }, color: 'text.secondary', lineHeight: 1.2 }}>
          {desc}
        </Typography>
      </CardContent>
    </Card>
  )
}

// ── Picker dialog ─────────────────────────────────────────────────────────────

function PickerDialog({
  open, onClose, title, titleColor, titleIcon, children,
}: {
  open: boolean; onClose: () => void
  title: string; titleColor: string; titleIcon: React.ReactNode
  children: React.ReactNode
}) {
  return (
    <Dialog
      open={open} onClose={onClose} maxWidth="xs" fullWidth
      slotProps={{ paper: { sx: { bgcolor: '#0f0f1a', borderRadius: 3, border: '1px solid rgba(255,255,255,0.08)', backgroundImage: 'none' } } }}
    >
      <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: `${titleColor}20`, color: titleColor, display: 'flex' }}>
            {titleIcon}
          </Box>
          <Typography variant="h6" sx={{ fontWeight: 700 }}>{title}</Typography>
        </Box>
        <IconButton size="small" onClick={onClose} sx={{ color: 'text.secondary' }}>
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      <DialogContent sx={{ p: 1, pb: 2 }}>{children}</DialogContent>
    </Dialog>
  )
}

// ── Page ──────────────────────────────────────────────────────────────────────

export default function Portal() {
  const [emailOpen, setEmailOpen] = useState(false)
  const [bankOpen,  setBankOpen]  = useState(false)

  function openBank(url: string) {
    window.open(url, '_blank')
    setBankOpen(false)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>App Portal</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 3 }}>Quick access to your tools and services.</Typography>

      <Grid container spacing={{ xs: 1.5, sm: 2 }}>

        {/* ── Lab & Tools ── */}
        <Grid size={12}>
          <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: 1.5, fontSize: 11 }}>
            Lab &amp; Tools
          </Typography>
        </Grid>

        {APPS.map((app) => (
          <Grid size={{ xs: 4, sm: 3, md: 2 }} key={app.name}>
            <IconCard
              name={app.name} desc={app.desc} color={app.color} icon={app.icon}
              onClick={() => window.open(app.url, '_blank')}
            />
          </Grid>
        ))}

        {/* ── Streaming ── */}
        <Grid size={12}>
          <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: 1.5, fontSize: 11, mt: 0.5, display: 'block' }}>
            Streaming
          </Typography>
        </Grid>

        {STREAMING.map((app) => (
          <Grid size={{ xs: 4, sm: 3, md: 2 }} key={app.name}>
            <IconCard
              name={app.name} desc={app.desc} color={app.color} icon={app.icon}
              onClick={() => window.open(app.url, '_blank')}
            />
          </Grid>
        ))}

        {/* ── Finance & Communication ── */}
        <Grid size={12}>
          <Typography variant="overline" color="text.disabled" sx={{ letterSpacing: 1.5, fontSize: 11, mt: 0.5, display: 'block' }}>
            Finance &amp; Communication
          </Typography>
        </Grid>

        <Grid size={{ xs: 4, sm: 3, md: 2 }}>
          <IconCard
            name="Banking" desc="5 accounts" color="#22c55e"
            icon={<AccountBalanceIcon />} badge={BANK_ACCOUNTS.length}
            onClick={() => setBankOpen(true)}
          />
        </Grid>

        <Grid size={{ xs: 4, sm: 3, md: 2 }}>
          <IconCard
            name="Email" desc="4 accounts" color="#fb923c"
            icon={<EmailIcon />} badge={EMAIL_ACCOUNTS.length}
            onClick={() => setEmailOpen(true)}
          />
        </Grid>

      </Grid>

      {/* Email picker */}
      <PickerDialog
        open={emailOpen} onClose={() => setEmailOpen(false)}
        title="Choose Account" titleColor="#fb923c" titleIcon={<EmailIcon fontSize="small" />}
      >
        <List disablePadding>
          {EMAIL_ACCOUNTS.map((account) => (
            <ListItem key={account.email} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => { window.open(`https://outlook.cloud.microsoft/mail/${account.email}/`, '_blank'); setEmailOpen(false) }}
                sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.2s', '&:hover': { bgcolor: `${account.color}15`, border: `1px solid ${account.color}40` } }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: account.color, mr: 2, flexShrink: 0 }} />
                <ListItemText
                  primary={account.label} secondary={account.email}
                  slotProps={{ primary: { style: { fontWeight: 600, fontSize: 14 } }, secondary: { style: { fontSize: 12, opacity: 0.6 } } }}
                />
                <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 1 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </PickerDialog>

      {/* Bank picker */}
      <PickerDialog
        open={bankOpen} onClose={() => setBankOpen(false)}
        title="Banking" titleColor="#22c55e" titleIcon={<AccountBalanceIcon fontSize="small" />}
      >
        <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
          Your phone will open the app automatically if installed
        </Typography>
        <List disablePadding>
          {BANK_ACCOUNTS.map((bank) => (
            <ListItem key={bank.label} disablePadding sx={{ mb: 0.5 }}>
              <ListItemButton
                onClick={() => openBank(bank.url)}
                sx={{ borderRadius: 2, border: '1px solid rgba(255,255,255,0.04)', transition: 'all 0.2s', '&:hover': { bgcolor: `${bank.color}15`, border: `1px solid ${bank.color}40` } }}
              >
                <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: bank.color, mr: 2, flexShrink: 0 }} />
                <ListItemText
                  primary={bank.label}
                  slotProps={{ primary: { style: { fontWeight: 600, fontSize: 14 } } }}
                />
                <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 1 }} />
              </ListItemButton>
            </ListItem>
          ))}
        </List>
      </PickerDialog>
    </Box>
  )
}
