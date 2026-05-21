import { Grid, Card, CardContent, Typography, Box, IconButton } from '@mui/material'
import StorageIcon from '@mui/icons-material/Storage'
import CodeIcon from '@mui/icons-material/Code'
import RouterIcon from '@mui/icons-material/Router'
import CloudIcon from '@mui/icons-material/Cloud'
import OpenInNewIcon from '@mui/icons-material/OpenInNew'

const APPS = [
  { name: 'Synology DSM', desc: 'NAS management', url: 'http://192.168.1.251:5000', icon: <StorageIcon fontSize="large" />, color: '#6366f1' },
  { name: 'GitHub', desc: 'kakoritz repos', url: 'https://github.com/kakoritz', icon: <CodeIcon fontSize="large" />, color: '#22c55e' },
  { name: 'Router', desc: 'Network admin', url: 'http://192.168.1.1', icon: <RouterIcon fontSize="large" />, color: '#f59e0b' },
  { name: 'Cloud Storage', desc: 'Remote backup', url: '#', icon: <CloudIcon fontSize="large" />, color: '#38bdf8' },
]

export default function Portal() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>App Portal</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Quick access to your tools and services.</Typography>

      <Grid container spacing={3}>
        {APPS.map((app) => (
          <Grid size={{ xs: 12, sm: 6, md: 3 }} key={app.name}>
            <Card
              sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', cursor: 'pointer', transition: 'border-color 0.2s', '&:hover': { borderColor: app.color } }}
              onClick={() => window.open(app.url, '_blank')}
            >
              <CardContent>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                  <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: `${app.color}22`, color: app.color, mb: 2 }}>
                    {app.icon}
                  </Box>
                  <IconButton size="small" sx={{ color: 'text.secondary' }}>
                    <OpenInNewIcon fontSize="small" />
                  </IconButton>
                </Box>
                <Typography variant="h6" sx={{ fontWeight: 600 }}>{app.name}</Typography>
                <Typography variant="body2" color="text.secondary">{app.desc}</Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>
    </Box>
  )
}
