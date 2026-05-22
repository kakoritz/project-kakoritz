import { useEffect, useState } from 'react'
import { Grid, Card, CardContent, Typography, Box } from '@mui/material'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import StorageIcon from '@mui/icons-material/Storage'
import WifiIcon from '@mui/icons-material/Wifi'
import MemoryIcon from '@mui/icons-material/Memory'

const SERVICES = [
  { name: 'NAS',       url: 'http://192.168.1.251:5000',        cors: false },
  { name: 'AdGuard',   url: 'http://192.168.1.251:3001',        cors: false },
  { name: 'Photo API', url: 'http://192.168.1.251:8586/health', cors: true  },
  { name: 'Claude AI', url: 'http://192.168.1.251:8587',        cors: false },
  { name: 'Router',    url: 'http://192.168.1.1',               cors: false },
]

type Status = 'checking' | 'up' | 'down'

async function ping(url: string, cors: boolean): Promise<boolean> {
  const ctrl = new AbortController()
  const timer = setTimeout(() => ctrl.abort(), 3000)
  try {
    await fetch(url, { mode: cors ? 'cors' : 'no-cors', signal: ctrl.signal })
    clearTimeout(timer)
    return true
  } catch {
    clearTimeout(timer)
    return false
  }
}

function StatCard({ title, value, sub, icon, color }: { title: string; value: string; sub?: string; icon: React.ReactNode; color: string }) {
  return (
    <Card sx={{
      bgcolor: 'background.paper',
      borderRadius: 3,
      border: '1px solid rgba(255,255,255,0.06)',
      borderLeft: `3px solid ${color}`,
      position: 'relative',
      overflow: 'hidden',
      '&::before': {
        content: '""',
        position: 'absolute',
        top: 0, left: 0, right: 0, bottom: 0,
        background: `linear-gradient(135deg, ${color}0a 0%, transparent 55%)`,
        pointerEvents: 'none',
      },
      '&:hover': { borderColor: color, boxShadow: `0 4px 24px ${color}20` },
    }}>
      <CardContent>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <Box>
            <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1.5, fontSize: 10 }}>{title}</Typography>
            <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>{value}</Typography>
            {sub && <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>{sub}</Typography>}
          </Box>
          <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${color}1a`, border: `1px solid ${color}30` }}>
            <Box sx={{ color }}>{icon}</Box>
          </Box>
        </Box>
      </CardContent>
    </Card>
  )
}

export default function Overview() {
  const [time, setTime] = useState(new Date())
  const [health, setHealth] = useState<Record<string, Status>>(
    Object.fromEntries(SERVICES.map(s => [s.name, 'checking' as Status]))
  )

  useEffect(() => {
    const t = setInterval(() => setTime(new Date()), 1000)
    return () => clearInterval(t)
  }, [])

  useEffect(() => {
    const check = async () => {
      const results = await Promise.all(
        SERVICES.map(async s => ({ name: s.name, up: await ping(s.url, s.cors) }))
      )
      setHealth(Object.fromEntries(results.map(r => [r.name, r.up ? 'up' : 'down'])))
    }
    void check()
    const interval = setInterval(() => void check(), 60_000)
    return () => clearInterval(interval)
  }, [])

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" sx={{ fontWeight: 700 }}>
          Good {time.getHours() < 12 ? 'Morning' : time.getHours() < 18 ? 'Afternoon' : 'Evening'} 👋
        </Typography>
        <Typography variant="body1" color="text.secondary">
          {time.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })} &nbsp;·&nbsp; {time.toLocaleTimeString()}
        </Typography>
      </Box>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="NAS Status" value="Online" sub="spiker-nas-1" icon={<StorageIcon />} color="#6366f1" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Network" value="Active" sub="192.168.1.x" icon={<WifiIcon />} color="#22c55e" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="CPU Temp" value="61°C" sub="i7-10850H" icon={<MemoryIcon />} color="#f59e0b" />
        </Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}>
          <StatCard title="Weather" value="—" sub="Loading..." icon={<WbSunnyIcon />} color="#38bdf8" />
        </Grid>

        <Grid size={12}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600, mb: 2 }}>Service Health</Typography>
              <Box sx={{ display: 'flex', gap: 1.5, flexWrap: 'wrap' }}>
                {SERVICES.map(svc => {
                  const status = health[svc.name]
                  const color = status === 'up' ? '#22c55e' : status === 'down' ? '#ef4444' : '#f59e0b'
                  const label = status === 'checking' ? 'Checking' : status === 'up' ? 'Online' : 'Offline'
                  return (
                    <Box key={svc.name} sx={{ display: 'flex', alignItems: 'center', gap: 0.75, px: 1.5, py: 0.75, borderRadius: 2, bgcolor: `${color}10`, border: `1px solid ${color}28` }}>
                      <Box sx={{
                        width: 7, height: 7, borderRadius: '50%', bgcolor: color, flexShrink: 0,
                        boxShadow: status === 'up' ? `0 0 6px ${color}` : 'none',
                        animation: status === 'checking' ? 'svc-pulse 1s ease infinite' : 'none',
                        '@keyframes svc-pulse': { '0%,100%': { opacity: 1 }, '50%': { opacity: 0.25 } },
                      }} />
                      <Typography sx={{ fontSize: 12, fontWeight: 700, color }}>{svc.name}</Typography>
                      <Typography sx={{ fontSize: 11, color: 'text.secondary' }}>{label}</Typography>
                    </Box>
                  )
                })}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
