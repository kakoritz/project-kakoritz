import { useState } from 'react'
import {
  Box, CssBaseline, ThemeProvider, createTheme,
  AppBar, Toolbar, Typography,
  Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText,
  BottomNavigation, BottomNavigationAction, Paper,
} from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'
import MonitorHeartIcon from '@mui/icons-material/MonitorHeart'
import BarChartIcon from '@mui/icons-material/BarChart'
import AppsIcon from '@mui/icons-material/Apps'
import HomeIcon from '@mui/icons-material/Home'
import WbSunnyIcon from '@mui/icons-material/WbSunny'
import PhotoLibraryIcon from '@mui/icons-material/PhotoLibrary'
import SmartToyIcon from '@mui/icons-material/SmartToy'
import ChecklistIcon from '@mui/icons-material/Checklist'
import Overview from './pages/Overview'
import LabMonitor from './pages/LabMonitor'
import Analytics from './pages/Analytics'
import Portal from './pages/Portal'
import Weather from './pages/Weather'
import Gallery from './pages/Gallery'
import ClaudeChat from './pages/ClaudeChat'
import Tasks from './pages/Tasks'

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
      styleOverrides: { root: { fontWeight: 500 } },
    },
  },
})

const DRAWER_WIDTH = 220

const NAV = [
  { label: 'Overview',    mobileLabel: 'Home',    icon: <HomeIcon />,         page: 'overview'  },
  { label: 'Weather',     mobileLabel: 'Weather', icon: <WbSunnyIcon />,      page: 'weather'   },
  { label: 'Lab Monitor', mobileLabel: 'Lab',     icon: <MonitorHeartIcon />, page: 'lab',       hideMobile: true },
  { label: 'Analytics',   mobileLabel: 'Stats',   icon: <BarChartIcon />,     page: 'analytics', hideMobile: true },
  { label: 'App Portal',  mobileLabel: 'Apps',    icon: <AppsIcon />,         page: 'portal'    },
  { label: 'Gallery',     mobileLabel: 'Gallery', icon: <PhotoLibraryIcon />, page: 'gallery'   },
  { label: 'Claude AI',   mobileLabel: 'AI',      icon: <SmartToyIcon />,     page: 'claude'    },
  { label: 'Tasks',       mobileLabel: 'Tasks',   icon: <ChecklistIcon />,    page: 'tasks'     },
]

export default function App() {
  const [page, setPage] = useState('overview')

  const sideNav = (
    <Box sx={{ mt: 8 }}>
      <List>
        {NAV.map((item) => (
          <ListItem key={item.page} disablePadding>
            <ListItemButton
              selected={page === item.page}
              onClick={() => setPage(item.page)}
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
      case 'overview':  return <Overview />
      case 'weather':   return <Weather />
      case 'lab':       return <LabMonitor />
      case 'analytics': return <Analytics />
      case 'portal':    return <Portal />
      case 'gallery':   return <Gallery />
      case 'claude':    return <ClaudeChat />
      case 'tasks':     return <Tasks />
      default:          return <Overview />
    }
  }

  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Box sx={{ display: 'flex' }}>

        {/* ── Top AppBar ─────────────────────────────────────────────────────── */}
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
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
              <Box sx={{
                p: 0.75, borderRadius: 1.5,
                background: 'linear-gradient(135deg, rgba(99,102,241,0.3) 0%, rgba(99,102,241,0.1) 100%)',
                border: '1px solid rgba(99,102,241,0.3)',
                display: 'flex', alignItems: 'center',
              }}>
                <DashboardIcon sx={{ color: 'primary.main', fontSize: 20 }} />
              </Box>
              <Typography variant="h6" sx={{ fontWeight: 800, letterSpacing: 2.5, fontSize: 15 }}>
                KAKORITZ
              </Typography>
            </Box>
          </Toolbar>
        </AppBar>

        {/* ── Desktop side drawer (sm+) ──────────────────────────────────────── */}
        <Drawer
          variant="permanent"
          sx={{
            width: DRAWER_WIDTH, flexShrink: 0,
            display: { xs: 'none', sm: 'block' },
            '& .MuiDrawer-paper': {
              width: DRAWER_WIDTH, boxSizing: 'border-box',
              bgcolor: '#0e0e1c', borderRight: '1px solid rgba(255,255,255,0.06)',
            },
          }}
        >
          {sideNav}
        </Drawer>

        {/* ── Main content ──────────────────────────────────────────────────── */}
        <Box
          component="main"
          sx={{
            flexGrow: 1,
            p: { xs: 2, sm: 3 },
            mt: 8,
            minHeight: '100vh',
            bgcolor: 'background.default',
            backgroundImage: 'radial-gradient(circle at 20% 0%, rgba(99,102,241,0.04) 0%, transparent 60%)',
            // Extra bottom padding on mobile so content clears the tab bar + safe area
            pb: { xs: 'calc(58px + env(safe-area-inset-bottom) + 16px)', sm: 3 },
          }}
        >
          {renderPage()}
        </Box>

        {/* ── Mobile bottom tab bar (xs only) ───────────────────────────────── */}
        <Paper
          elevation={0}
          sx={{
            position: 'fixed', bottom: 0, left: 0, right: 0,
            display: { xs: 'block', sm: 'none' },
            zIndex: (t) => t.zIndex.appBar,
            bgcolor: 'rgba(10,10,20,0.85)',
            backdropFilter: 'blur(16px)',
            WebkitBackdropFilter: 'blur(16px)',
            borderTop: '1px solid rgba(255,255,255,0.08)',
            backgroundImage: 'none',
            paddingBottom: 'env(safe-area-inset-bottom)',
          }}
        >
          <BottomNavigation
            value={page}
            onChange={(_, v) => setPage(v)}
            sx={{
              bgcolor: 'transparent',
              height: 58,
            }}
          >
            {NAV.filter(item => !item.hideMobile).map((item) => (
              <BottomNavigationAction
                key={item.page}
                value={item.page}
                label={item.mobileLabel}
                icon={item.icon}
                showLabel
                sx={{
                  color: 'rgba(255,255,255,0.35)',
                  minWidth: 0,
                  px: 0.5,
                  transition: 'color 0.2s ease',
                  '&.Mui-selected': {
                    color: '#6366f1',
                  },
                  '& .MuiBottomNavigationAction-label': {
                    fontSize: 10,
                    mt: 0.25,
                    '&.Mui-selected': { fontSize: 10, fontWeight: 600 },
                  },
                }}
              />
            ))}
          </BottomNavigation>
        </Paper>

      </Box>
    </ThemeProvider>
  )
}
