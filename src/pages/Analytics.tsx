import { Card, CardContent, Typography, Box, Grid } from '@mui/material'
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar } from 'recharts'

const networkData = Array.from({ length: 12 }, (_, i) => ({
  time: `${i * 2}:00`,
  upload: Math.floor(Math.random() * 50) + 10,
  download: Math.floor(Math.random() * 200) + 50,
}))

const storageData = [
  { name: 'Documents', value: 12 },
  { name: 'Pictures', value: 48 },
  { name: 'Programs', value: 8 },
  { name: 'AppData', value: 6 },
  { name: 'Other', value: 18 },
]

export default function Analytics() {
  return (
    <Box>
      <Typography variant="h4" sx={{ fontWeight: 700 }} gutterBottom>Analytics</Typography>
      <Typography variant="body1" color="text.secondary" sx={{ mb: 4 }}>Network and storage trends.</Typography>

      <Grid container spacing={3}>
        <Grid size={{ xs: 12, md: 8 }}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>Network Traffic (MB/s)</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <AreaChart data={networkData}>
                  <defs>
                    <linearGradient id="upload" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="download" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#22c55e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#22c55e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis dataKey="time" stroke="#666" tick={{ fontSize: 12 }} />
                  <YAxis stroke="#666" tick={{ fontSize: 12 }} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Area type="monotone" dataKey="upload" stroke="#6366f1" fill="url(#upload)" />
                  <Area type="monotone" dataKey="download" stroke="#22c55e" fill="url(#download)" />
                </AreaChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>

        <Grid size={{ xs: 12, md: 4 }}>
          <Card sx={{ bgcolor: 'background.paper', borderRadius: 3, border: '1px solid rgba(255,255,255,0.06)', height: '100%' }}>
            <CardContent>
              <Typography variant="h6" sx={{ fontWeight: 600 }} gutterBottom>NAS Storage by Folder (GB)</Typography>
              <ResponsiveContainer width="100%" height={250}>
                <BarChart data={storageData} layout="vertical">
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                  <XAxis type="number" stroke="#666" tick={{ fontSize: 12 }} />
                  <YAxis dataKey="name" type="category" stroke="#666" tick={{ fontSize: 12 }} width={70} />
                  <Tooltip contentStyle={{ backgroundColor: '#1a1a2e', border: '1px solid rgba(255,255,255,0.1)', borderRadius: 8 }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[0, 4, 4, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  )
}
