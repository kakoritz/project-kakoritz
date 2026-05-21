import { Grid, Card, CardContent, Typography, Box, LinearProgress } from '@mui/material'

function GaugeCard({ title, value, max, unit, color }: { title: string; value: number; max: number; unit: string; color: string }) {
  const pct = Math.min((value / max) * 100, 100)
  return (
    <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
      <CardContent>
        <Typography variant="caption" color="text.secondary" sx={{ textTransform: 'uppercase', letterSpacing: 1 }}>{title}</Typography>
        <Typography variant="h4" sx={{ fontWeight: 700, mt: 0.5 }}>
          {value}<Typography component="span" variant="body2" color="text.secondary"> {unit}</Typography>
        </Typography>
        <LinearProgress variant="determinate" value={pct} sx={{ mt: 2, height: 6, borderRadius: 3, bgcolor: 'rgba(255,255,255,0.08)', '& .MuiLinearProgress-bar': { bgcolor: color } }} />
        <Typography variant="caption" color="text.secondary">{pct.toFixed(0)}% of {max}{unit}</Typography>
      </CardContent>
    </Card>
  )
}

export default function LabMonitor() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>Lab Monitor</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Real-time stats — connect your NAS API to populate live data.</Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><GaugeCard title="CPU Temp" value={61} max={100} unit="°C" color="#f59e0b" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><GaugeCard title="GPU Temp" value={53} max={100} unit="°C" color="#6366f1" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><GaugeCard title="RAM Used" value={3.2} max={80} unit=" GB" color="#22c55e" /></Grid>
        <Grid size={{ xs: 12, sm: 6, md: 3 }}><GaugeCard title="NAS Disk" value={36} max={931} unit=" GB" color="#38bdf8" /></Grid>

        <Grid size={12}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Devices on Network</Typography>
              {[
                { name: 'spiker-nas-1', ip: '192.168.1.251', status: 'Online' },
                { name: 'kakoritz-laptop', ip: '192.168.1.152', status: 'Online' },
              ].map((d) => (
                <Box key={d.name} sx={{ display: 'flex', justifyContent: 'space-between', py: 1, borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                  <Typography>{d.name}</Typography>
                  <Typography color="text.secondary">{d.ip}</Typography>
                  <Typography color="success.main">{d.status}</Typography>
                </Box>
              ))}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
