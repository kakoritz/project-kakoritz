import { useState } from 'react'
import { Grid, Card, CardContent, Typography, Box, IconButton, Dialog, DialogContent, DialogTitle, List, ListItem, ListItemButton, ListItemText, Chip } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import CodeIcon from '@mui/icons-material/Code'
import RouterIcon from '@mui/icons-material/Router'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'
import SecurityIcon from '@mui/icons-material/Security'
import Inventory2Icon from '@mui/icons-material/Inventory2'
import EmailIcon from '@mui/icons-material/Email'
import AccountBalanceIcon from '@mui/icons-material/AccountBalance'
import CloseIcon from '@mui/icons-material/Close'

const APPS = [
  { name: 'Synology DSM',      desc: 'NAS management',     url: 'http://192.168.1.251:5000', icon: <StorageIcon fontSize="large" />,   color: '#6366f1' },
  { name: 'AdGuard Home',      desc: 'DNS & ad blocking',  url: 'http://192.168.1.251:3001', icon: <SecurityIcon fontSize="large" />,  color: '#22c55e' },
  { name: 'Container Manager', desc: 'Docker on NAS',      url: 'http://192.168.1.251:5000', icon: <Inventory2Icon fontSize="large" />,color: '#38bdf8' },
  { name: 'GitHub',            desc: 'kakoritz repos',     url: 'https://github.com/kakoritz', icon: <CodeIcon fontSize="large" />,   color: '#a78bfa' },
  { name: 'Router',            desc: 'Network admin',      url: 'http://192.168.1.1',        icon: <RouterIcon fontSize="large" />,   color: '#f59e0b' },
]

const BANK_ACCOUNTS = [
  { label: 'PNC Bank',    url: 'https://www.pnc.com/',            appScheme: 'pnc://',      color: '#f59e0b' },
  { label: 'Wells Fargo', url: 'https://www.wellsfargo.com/',     appScheme: 'wellsfargo://',color: '#dc2626' },
  { label: 'Venmo',       url: 'https://venmo.com/',              appScheme: 'venmo://',    color: '#38bdf8' },
  { label: 'Cash App',    url: 'https://cash.app/',               appScheme: 'cashme://',   color: '#22c55e' },
  { label: 'Chime',       url: 'https://www.chime.com/',          appScheme: 'chime://',    color: '#a78bfa' },
]

const EMAIL_ACCOUNTS = [
  { label: 'Decked Out Games',       email: 'aspiker@deckedoutgames.com',        color: '#6366f1' },
  { label: 'Decked Out Publishing',  email: 'aspiker@deckedoutpublishing.com',   color: '#22c55e' },
  { label: 'Personal',               email: 'adam@adamscottspiker.org',          color: '#38bdf8' },
  { label: 'Pander Hollow Ministries', email: 'support@panderhollowministries.org', color: '#f59e0b' },
]

function AppCard({ name, desc, url, icon, color }: typeof APPS[0]) {
  return (
    <Card
      onClick={() => window.open(url, '_blank')}
      sx={{
        bgcolor: 'background.paper', borderRadius: 3, height: '100%',
        border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
        transition: 'border-color 0.2s, box-shadow 0.2s',
        '&:hover': { borderColor: color, boxShadow: `0 4px 24px ${color}20` },
      }}
    >
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}1a`, border: `1px solid ${color}30`, color, mb: 2 }}>
            {icon}
          </Box>
          <IconButton size="small" sx={{ color: 'text.secondary' }}>
            <OpenInNewIcon fontSize="small" />
          </IconButton>
        </Box>
        <Typography variant="h6" sx={{ fontWeight: 600 }}>{name}</Typography>
        <Typography variant="body2" color="text.secondary">{desc}</Typography>
      </CardContent>
    </Card>
  )
}

export default function Portal() {
  const [emailOpen, setEmailOpen] = useState(false)
  const [bankOpen, setBankOpen] = useState(false)

  function openBank(appScheme: string, webUrl: string) {
    // Try native app first; fall back to web after 1.5s if app isn't installed
    window.location.href = appScheme
    setTimeout(() => window.open(webUrl, '_blank'), 1500)
    setBankOpen(false)
  }

  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>App Portal</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Quick access to your tools and services.</Typography>

      <Grid container spacing={3}>
        {/* App cards */}
        {APPS.map((app) => (
          <Grid size={{ xs: 12, sm: 6, md: 4 }} key={app.name}>
            <AppCard {...app} />
          </Grid>
        ))}

        {/* Bank card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            onClick={() => setBankOpen(true)}
            sx={{
              bgcolor: 'background.paper', borderRadius: 3, height: '100%',
              border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: '#22c55e', boxShadow: '0 4px 24px rgba(34,197,94,0.15)' },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(34,197,94,0.12)', border: '1px solid rgba(34,197,94,0.25)', color: '#22c55e', mb: 2 }}>
                  <AccountBalanceIcon fontSize="large" />
                </Box>
                <Chip label={`${BANK_ACCOUNTS.length}`} size="small" sx={{ bgcolor: 'rgba(34,197,94,0.15)', color: '#22c55e', fontSize: 11, fontWeight: 700 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Banking</Typography>
              <Typography variant="body2" color="text.secondary">
                {BANK_ACCOUNTS.length} accounts · opens app if installed
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        {/* Email card */}
        <Grid size={{ xs: 12, sm: 6, md: 4 }}>
          <Card
            onClick={() => setEmailOpen(true)}
            sx={{
              bgcolor: 'background.paper', borderRadius: 3, height: '100%',
              border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer',
              transition: 'border-color 0.2s, box-shadow 0.2s',
              '&:hover': { borderColor: '#fb923c', boxShadow: '0 4px 24px rgba(251,146,60,0.15)' },
            }}
          >
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: 'rgba(251,146,60,0.12)', border: '1px solid rgba(251,146,60,0.25)', color: '#fb923c', mb: 2 }}>
                  <EmailIcon fontSize="large" />
                </Box>
                <Chip label={`${EMAIL_ACCOUNTS.length}`} size="small" sx={{ bgcolor: 'rgba(251,146,60,0.15)', color: '#fb923c', fontSize: 11, fontWeight: 700 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 600 }}>Email</Typography>
              <Typography variant="body2" color="text.secondary">
                {EMAIL_ACCOUNTS.length} accounts · tap to choose
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Email account picker */}
      <Dialog
        open={emailOpen}
        onClose={() => setEmailOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0f0f1a', borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundImage: 'none',
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(251,146,60,0.15)', color: '#fb923c', display: 'flex' }}>
              <EmailIcon fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Choose Account</Typography>
          </Box>
          <IconButton size="small" onClick={() => setEmailOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 1, pb: 2 }}>
          <List disablePadding>
            {EMAIL_ACCOUNTS.map((account) => (
              <ListItem key={account.email} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => {
                    window.open(`https://outlook.cloud.microsoft/mail/${account.email}/`, '_blank')
                    setEmailOpen(false)
                  }}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: `${account.color}15`,
                      border: `1px solid ${account.color}40`,
                    },
                  }}
                >
                  {/* Color dot */}
                  <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: account.color, mr: 2, flexShrink: 0 }} />
                  <ListItemText
                    primary={account.label}
                    secondary={account.email}
                    slotProps={{
                      primary: { style: { fontWeight: 600, fontSize: 14 } },
                      secondary: { style: { fontSize: 12, opacity: 0.6 } },
                    }}
                  />
                  <OpenInNewIcon sx={{ fontSize: 14, color: 'text.secondary', ml: 1 }} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </DialogContent>
      </Dialog>

      {/* Bank picker */}
      <Dialog
        open={bankOpen}
        onClose={() => setBankOpen(false)}
        maxWidth="xs"
        fullWidth
        slotProps={{
          paper: {
            sx: {
              bgcolor: '#0f0f1a', borderRadius: 3,
              border: '1px solid rgba(255,255,255,0.08)',
              backgroundImage: 'none',
            }
          }
        }}
      >
        <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
            <Box sx={{ p: 0.75, borderRadius: 1.5, bgcolor: 'rgba(34,197,94,0.15)', color: '#22c55e', display: 'flex' }}>
              <AccountBalanceIcon fontSize="small" />
            </Box>
            <Typography variant="h6" sx={{ fontWeight: 700 }}>Banking</Typography>
          </Box>
          <IconButton size="small" onClick={() => setBankOpen(false)} sx={{ color: 'text.secondary' }}>
            <CloseIcon fontSize="small" />
          </IconButton>
        </DialogTitle>

        <DialogContent sx={{ p: 1, pb: 2 }}>
          <Typography variant="caption" color="text.secondary" sx={{ px: 1, mb: 1, display: 'block' }}>
            Opens native app if installed, otherwise opens in browser
          </Typography>
          <List disablePadding>
            {BANK_ACCOUNTS.map((bank) => (
              <ListItem key={bank.label} disablePadding sx={{ mb: 0.5 }}>
                <ListItemButton
                  onClick={() => openBank(bank.appScheme, bank.url)}
                  sx={{
                    borderRadius: 2,
                    border: '1px solid rgba(255,255,255,0.04)',
                    transition: 'all 0.2s',
                    '&:hover': {
                      bgcolor: `${bank.color}15`,
                      border: `1px solid ${bank.color}40`,
                    },
                  }}
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
        </DialogContent>
      </Dialog>
    </Box>
  )
}
