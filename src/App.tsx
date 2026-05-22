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
    background: { default: '#0a0a14', paper: '#13131f' },
  },
  typography: { fontFamily: '"Inter", "Roboto", sans-serif' },
  shape: { borderRadius: 12 },
  components: {
    MuiCard: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
        },
      },
    },
    MuiChip: {
      styleOverrides: {
        root: { fontWeight: 500 },
      },
    },
  },
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
              sx={{
                borderRadius: 2, mx: 1, mb: 0.5,
                transition: 'all 0.2s ease',
                '&.Mui-selected': {
                  background: 'linear-gradient(90deg, rgba(99,102,241,0.18) 0%, rgba(99,102,241,0.05) 100%)',
                  boxShadow: 'inset 3px 0 0 #6366f1',
                  '& .MuiListItemIcon-root': { color: '#6366f1' },
                  '& .MuiListItemText-primary': { color: 'white', fontWeight: 600 },
                  '&:hover': { background: 'linear-gradient(90deg, rgba(99,102,241,0.25) 0%, rgba(99,102,241,0.08) 100%)' },
                },
                '&:hover': { bgcolor: 'rgba(255,255,255,0.05)' },
              }}
            >
              <ListItemIcon sx={{ minWidth: 36, color: 'text.secondary' }}>{item.icon}</ListItemIcon>
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
        <AppBar
          position="fixed"
          elevation={0}
          sx={{
            zIndex: (t) => t.zIndex.drawer + 1,
            bgcolor: 'rgba(10,10,20,0.75)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderBottom: '1px solid rgba(255,255,255,0.07)',
            backgroundImage: 'none',
          }}
        >
          <Toolbar>
            <IconButton edge="start" sx={{ mr: 2, display: { sm: 'none' } }} onClick={() => setMobileOpen(!mobileOpen)}>
              <MenuIcon />
            </IconButton>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                p: 0.75, borderRadius: 1.5,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.1) 100%)',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center',
              }}>
                <DashboardIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 2.5, fontSize: 15 }}>KAKORITZ</Typography>
            </Box>
          </Toolbar>
        </AppBar>

        <Drawer variant="permanent" sx={{ width: DRAWER_WIDTH, flexShrink: 0, display: { xs: 'none', sm: 'block' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH, boxSizing: 'border-box', bgcolor: '#0e0e1c', borderRight: '1px solid rgba(255,255,255,0.06)' } }}>
          {drawer}
        </Drawer>

        <Drawer variant="temporary" open={mobileOpen} onClose={() => setMobileOpen(false)} sx={{ display: { xs: 'block', sm: 'none' }, '& .MuiDrawer-paper': { width: DRAWER_WIDTH } }}>
          {drawer}
        </Drawer>

        <Box component="main" sx={{ flexGrow: 1, p: 3, mt: 8, minHeight: '100vh', bgcolor: 'background.default', backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(99,102,241,0.04) 0%, transparent 60%)' }}>
          {renderPage()}
        </Box>
      </Box>
    </ThemeProvider>
  )
}
