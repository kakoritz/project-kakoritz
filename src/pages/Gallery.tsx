import { useEffect, useState, useRef } from 'react'
import { Box, Typography, CircularProgress, IconButton, Dialog, Tooltip } from '@mui/material'
import { RefreshCw, X, ZoomIn } from 'lucide-react'

const API = 'http://192.168.1.251:8586'
const ROTATE_MS = 15 * 1000
const GRID_COUNT = 24

const SIZES = [
  { col: 'span 1', row: 'span 1' },
  { col: 'span 1', row: 'span 1' },
  { col: 'span 1', row: 'span 1' },
  { col: 'span 2', row: 'span 1' },
  { col: 'span 1', row: 'span 2' },
  { col: 'span 2', row: 'span 2' },
]

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

export default function Gallery() {
  const [allPhotos, setAllPhotos] = useState<string[]>([])
  const [displayed, setDisplayed] = useState<{ src: string; size: typeof SIZES[0]; fading: boolean }[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [lightbox, setLightbox] = useState<string | null>(null)
  const allPhotosRef = useRef<string[]>([])
  const displayedRef = useRef(displayed)

  useEffect(() => { displayedRef.current = displayed }, [displayed])

  useEffect(() => {
    fetch(`${API}/api/photos`)
      .then(r => r.json())
      .then((photos: string[]) => {
        allPhotosRef.current = photos
        setAllPhotos(photos)
        const picked = shuffle(photos).slice(0, GRID_COUNT)
        setDisplayed(picked.map(src => ({ src, size: SIZES[Math.floor(Math.random() * SIZES.length)], fading: false })))
        setLoading(false)
      })
      .catch(() => { setError('Cannot reach photo API. Is the container running on port 8586?'); setLoading(false) })
  }, [])

  // Rotate one photo every 15 seconds
  useEffect(() => {
    if (!allPhotos.length) return
    const t = setInterval(() => {
      const current = displayedRef.current
      if (!current.length) return

      const currentSrcs = new Set(current.map(p => p.src))
      const pool = allPhotosRef.current.filter(p => !currentSrcs.has(p))
      if (!pool.length) return

      const slotIdx = Math.floor(Math.random() * current.length)
      const newSrc = pool[Math.floor(Math.random() * pool.length)]

      // Fade out
      setDisplayed(prev => prev.map((p, i) => i === slotIdx ? { ...p, fading: true } : p))

      // Swap after fade
      setTimeout(() => {
        setDisplayed(prev => prev.map((p, i) =>
          i === slotIdx ? { src: newSrc, size: p.size, fading: false } : p
        ))
      }, 600)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [allPhotos])

  const shuffleAll = () => {
    const picked = shuffle(allPhotosRef.current).slice(0, GRID_COUNT)
    setDisplayed(picked.map(src => ({ src, size: SIZES[Math.floor(Math.random() * SIZES.length)], fading: false })))
  }

  if (loading) return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 10 }}><CircularProgress /></Box>
  if (error) return (
    <Box sx={{ mt: 6, textAlign: 'center' }}>
      <Typography color="error" gutterBottom>{error}</Typography>
      <Typography variant="body2" color="text.secondary">Make sure the photo-api container is running on port 8586.</Typography>
    </Box>
  )

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Box>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>Family Photos</Typography>
          <Typography variant="body2" color="text.secondary">
            {allPhotos.length} photos · one photo rotates every 15 seconds
          </Typography>
        </Box>
        <Tooltip title="Shuffle all">
          <IconButton onClick={shuffleAll} sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{
        display: 'grid',
        gridTemplateColumns: 'repeat(4, 1fr)',
        gridAutoRows: '180px',
        gap: 1.5,
      }}>
        {displayed.map(({ src, size, fading }, i) => (
          <Box
            key={`slot-${i}`}
            onClick={() => setLightbox(src)}
            sx={{
              gridColumn: size.col,
              gridRow: size.row,
              borderRadius: 2,
              overflow: 'hidden',
              cursor: 'pointer',
              position: 'relative',
              bgcolor: 'background.paper',
              border: '1px solid rgba(255,255,255,0.06)',
              '&:hover .overlay': { opacity: 1 },
              '&:hover img': { transform: 'scale(1.05)' },
            }}
          >
            <Box
              component="img"
              src={`${API}/photos/${encodeURIComponent(src)}`}
              alt=""
              loading="lazy"
              sx={{
                width: '100%', height: '100%',
                objectFit: 'cover',
                display: 'block',
                transition: 'transform 0.4s ease, opacity 0.6s ease',
                opacity: fading ? 0 : 1,
              }}
            />
            <Box className="overlay" sx={{
              position: 'absolute', inset: 0,
              bgcolor: 'rgba(0,0,0,0.45)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              opacity: 0, transition: 'opacity 0.3s ease',
            }}>
              <ZoomIn size={28} color="white" />
            </Box>
          </Box>
        ))}
      </Box>

      {/* Lightbox */}
      <Dialog
        open={!!lightbox}
        onClose={() => setLightbox(null)}
        maxWidth={false}
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}
      >
        <Box sx={{ position: 'relative' }}>
          <IconButton
            onClick={() => setLightbox(null)}
            sx={{ position: 'absolute', top: -16, right: -16, bgcolor: 'rgba(0,0,0,0.7)', zIndex: 1, '&:hover': { bgcolor: 'rgba(0,0,0,0.9)' } }}
          >
            <X size={20} />
          </IconButton>
          {lightbox && (
            <Box
              component="img"
              src={`${API}/photos/${encodeURIComponent(lightbox)}`}
              alt=""
              sx={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 2, display: 'block' }}
            />
          )}
        </Box>
      </Dialog>
    </Box>
  )
}
