import { useState } from 'react'
import { Box, CssBaseline, ThemeProvider, createTheme, AppBar, Toolbar, Typography, Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, IconButton } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import BarChartIcon from '@mui/icons-material/BarChart'
import AppsIcon from '@mui/icons-material/Apps'
import HomeIcon from '@mui/icons-material/Home'
import MenuIcon from '@mui/icons-material/Menu'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import Overview from './pages/Overview'
import LabMonitor from './pages/LabMonitor'
import Analytics from './pages/Analytics'
import Portal from './pages/Portal'
import Weather from './pages/Weather'
import Gallery from './pages/Gallery'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: { main: '#6366f1' },
    background: { default: '#0f0f1a', paper: '#1a1a2e' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
})

const DRAWER_WIDTH = 220

const NAV = [
  { label: 'Overview', icon: <HomeIcon />, page: 'overview' },
  { label: 'Weather', icon: <WbSunnyIcon />, page: 'weather' },
  { label: 'Lab Monitor', icon: <MonitorHeartIcon />, page: 'lab' },
  { label: 'Analytics', icon: <BarChartIcon />, page: 'analytics' },
  { label: 'App Portal', icon: <AppsIcon />, page: 'portal' },
  { label: 'Gallery', icon: <PhotoLibraryIcon />, page: 'gallery' },
]

export default function App() {
  const [page, setPage] = useState('overview')
  const [mobileOpen, setMobileOpen] = useState(false)

  const drawer = (
    <Box sx={{ mt: 8 }}>
      <List>
        {NAV.map((item) => (
          <ListItem key={item.page} disablePadding>
            <ListItemButton
              selected={page === item.page}
              onClick={() => { setPage(item.page); setMobileOpen(false) }}
              sx={{ borderRadius: 2, mx: 1, mb: 0.5 }}
            >
              <ListItemIcon sx={{ minWidth: 36 }}>{item.icon}</ListItemIcon>
              <ListItemText primary={item.label} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </Box>
  )

  const renderPage = () => {
    switch (page) {
      case 'overview': return <Overview />
      case 'weather': return <Weather />
      case 'lab': return <LabMonitor />
      case 'analytics': return <Analytics />
      case 'portal': return <Portal />
      case 'gallery': return <Gallery />
      default: return <Overview />
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>
        <AppBar position="fixed" sx={{ zIndex: (t) => t.zIndex.drawer + 1, bgcolor: 'background.paper', borderBottom: '1px solid rgba(255,255,255,0.08)' }} elevation={0}>
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2, display: { sm: 'none' } }} onClick={() => setMobileOpen(!mobileOpen)}>
              <MenuIcon />
            </IconButton>
            <DashboardIcon sx={{ mr: 1.5, color: 'primary.main' }} />
            <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 1 }}>KAKORITZ</Typography>
          </Toolbar>
        </AppBar>

        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: 'background.paper', borderRight: '1px solid rgba(255,255,255,0.08)' } }}>
          {drawer}
        </Drawer>

        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          {drawer}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minHeight: '100vh', bgcolor: 'background.default' }}>
          {renderPage()}
        </Box>
      </Box>
    </ThemeProvider>
  )
}
