import { Box, Typography } from '@mui/material'
import DashboardIcon from '@mui/icons-material/Dashboard'

export default function LoadingScreen({ message = 'Loading...' }: { message?: string }) {
  return (
    <Box
      sx={{
        display: 'flex', flexDirection: 'column', alignItems: 'center',
        justifyContent: 'center', minHeight: '60vh', gap: 3,
      }}
    >
      {/* Animated icon ring */}
      <Box sx={{ position: 'relative', width: 88, height: 88 }}>
        {/* Outer pulse ring */}
        <Box sx={{
          position: 'absolute', inset: 0, borderRadius: '50%',
          border: '1px solid rgba(99,102,241,0.35)',
          '@keyframes ringPulse': {
            '0%,100%': { transform: 'scale(1)', opacity: 0.4 },
            '50%': { transform: 'scale(1.18)', opacity: 1 },
          },
          animation: 'ringPulse 2.2s ease-in-out infinite',
        }} />
        {/* Spinning arc */}
        <Box sx={{
          position: 'absolute', inset: 6, borderRadius: '50%',
          border: '2px solid transparent',
          borderTopColor: '#6366f1',
          borderRightColor: 'rgba(99,102,241,0.3)',
          '@keyframes spin': { to: { transform: 'rotate(360deg)' } },
          animation: 'spin 1.1s linear infinite',
        }} />
        {/* Center icon with glow */}
        <Box sx={{
          position: 'absolute', inset: 0, display: 'flex',
          alignItems: 'center', justifyContent: 'center',
          '@keyframes iconPulse': {
            '0%,100%': { filter: 'drop-shadow(0 0 6px rgba(99,102,241,0.5))' },
            '50%': { filter: 'drop-shadow(0 0 14px rgba(99,102,241,0.9))' },
          },
          animation: 'iconPulse 2.2s ease-in-out infinite',
        }}>
          <DashboardIcon sx={{ color: '#6366f1', fontSize: 30 }} />
        </Box>
      </Box>

      {/* Brand + message */}
      <Box sx={{ textAlign: 'center' }}>
        <Typography variant="h6" sx={{ fontWeight: 700, letterSpacing: 3, mb: 0.5, color: 'white' }}>
          KAKORITZ
        </Typography>
        <Typography variant="body2" sx={{ color: 'text.secondary', letterSpacing: 1.5, textTransform: 'uppercase', fontSize: 11 }}>
          {message}
        </Typography>
      </Box>

      {/* Shimmer bar */}
      <Box sx={{ width: 180, height: 2, borderRadius: 1, bgcolor: 'rgba(255,255,255,0.06)', overflow: 'hidden' }}>
        <Box sx={{
          width: '45%', height: '100%', borderRadius: 1,
          background: 'linear-gradient(90deg, transparent, #6366f1, rgba(99,102,241,0.3), transparent)',
          '@keyframes shimmer': {
            '0%': { transform: 'translateX(-160px)' },
            '100%': { transform: 'translateX(360px)' },
          },
          animation: 'shimmer 1.6s ease-in-out infinite',
        }} />
      </Box>
    </Box>
  )
}
