import { useEffect, useState, useRef } from 'react'
import { Box, Typography, IconButton, Card, Dialog, Tooltip, Chip } from '@mui/material'
import LoadingScreen from '../components/LoadingScreen'
import { ArrowLeft, RefreshCw, X, ZoomIn, Images } from 'lucide-react'

const API = 'http://192.168.1.251:8586'
const ROTATE_MS = 15 * 1000
const DRILL_COUNT = 10

interface Category {
  id: string
  label: string
  emoji: string
  count: number
  thumbnail: string | null
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]]
  }
  return a
}

function photoUrl(src: string) {
  return `${API}/photos/${src.split('/').map(encodeURIComponent).join('/')}`
}

// ── Category grid ────────────────────────────────────────────────────────────

function CategoryCard({ cat, onClick }: { cat: Category; onClick: () => void }) {
  return (
    <Card
      onClick={onClick}
      sx={{
        position: 'relative', height: 220, cursor: 'pointer', borderRadius: 3, overflow: 'hidden',
        border: '1px solid rgba(255,255,255,0.06)',
        transition: 'transform 0.25s ease, box-shadow 0.25s ease',
        '&:hover': { transform: 'translateY(-6px)', boxShadow: '0 16px 40px rgba(0,0,0,0.5)' },
        '&:hover .card-overlay': { bgcolor: 'rgba(0,0,0,0.3)' },
      }}
    >
      {cat.thumbnail ? (
        <Box component="img" src={photoUrl(cat.thumbnail)} alt={cat.label}
          sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease' }} />
      ) : (
        <Box sx={{ width: '100%', height: '100%', bgcolor: 'background.paper', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Typography sx={{ fontSize: 48 }}>{cat.emoji}</Typography>
        </Box>
      )}
      <Box className="card-overlay" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.45)', transition: 'background 0.3s ease' }} />
      <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, background: 'linear-gradient(transparent, rgba(0,0,0,0.85))' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography sx={{ fontSize: 22 }}>{cat.emoji}</Typography>
            <Typography variant="h6" sx={{ fontWeight: 700, color: 'white' }}>{cat.label}</Typography>
          </Box>
          <Chip label={`${cat.count}`} size="small" icon={<Images size={12} />} sx={{ bgcolor: 'rgba(255,255,255,0.15)', color: 'white', fontSize: 11 }} />
        </Box>
      </Box>
    </Card>
  )
}

// ── Drill-in view ────────────────────────────────────────────────────────────

function DrillView({ cat, onBack }: { cat: Category; onBack: () => void }) {
  const [photos, setPhotos] = useState<string[]>([])
  const [slots, setSlots] = useState<{ src: string; fading: boolean }[]>([])
  const [lightbox, setLightbox] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)
  const allRef = useRef<string[]>([])
  const slotsRef = useRef(slots)
  useEffect(() => { slotsRef.current = slots }, [slots])

  useEffect(() => {
    fetch(`${API}/api/category/${cat.id}`)
      .then(r => r.json())
      .then((imgs: string[]) => {
        allRef.current = imgs
        setPhotos(imgs)
        const picked = shuffle(imgs).slice(0, DRILL_COUNT)
        setSlots(picked.map(src => ({ src, fading: false })))
        setLoading(false)
      })
  }, [cat.id])

  useEffect(() => {
    if (!photos.length) return
    const t = setInterval(() => {
      const current = slotsRef.current
      const currentSet = new Set(current.map(s => s.src))
      const pool = allRef.current.filter(p => !currentSet.has(p))
      if (!pool.length) return
      const idx = Math.floor(Math.random() * current.length)
      const next = pool[Math.floor(Math.random() * pool.length)]
      setSlots(prev => prev.map((s, i) => i === idx ? { ...s, fading: true } : s))
      setTimeout(() => setSlots(prev => prev.map((s, i) => i === idx ? { src: next, fading: false } : s)), 700)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [photos])

  const reshuffle = () => {
    const picked = shuffle(allRef.current).slice(0, DRILL_COUNT)
    setSlots(picked.map(src => ({ src, fading: false })))
  }

  if (loading) return <LoadingScreen message="Loading photos" />

  return (
    <Box>
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, mb: 3 }}>
        <IconButton onClick={onBack} sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
          <ArrowLeft size={18} />
        </IconButton>
        <Box sx={{ flex: 1 }}>
          <Typography variant="h4" sx={{ fontWeight: 700 }}>{cat.emoji} {cat.label}</Typography>
          <Typography variant="body2" color="text.secondary">
            {cat.count} photos · showing {Math.min(DRILL_COUNT, slots.length)} · rotating every 15s
          </Typography>
        </Box>
        <Tooltip title="Reshuffle">
          <IconButton onClick={reshuffle} sx={{ bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.08)' }}>
            <RefreshCw size={18} />
          </IconButton>
        </Tooltip>
      </Box>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: 2 }}>
        {slots.map(({ src, fading }, i) => (
          <Box key={`slot-${i}`} onClick={() => setLightbox(src)}
            sx={{
              borderRadius: 3, overflow: 'hidden', cursor: 'pointer', position: 'relative',
              aspectRatio: '4/3', bgcolor: 'background.paper', border: '1px solid rgba(255,255,255,0.06)',
              '&:hover .zo': { opacity: 1 }, '&:hover img': { transform: 'scale(1.05)' },
            }}
          >
            <Box component="img" src={photoUrl(src)} alt="" loading="lazy"
              sx={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transition: 'transform 0.4s ease, opacity 0.7s ease', opacity: fading ? 0 : 1 }} />
            <Box className="zo" sx={{ position: 'absolute', inset: 0, bgcolor: 'rgba(0,0,0,0.4)', display: 'flex', alignItems: 'center', justifyContent: 'center', opacity: 0, transition: 'opacity 0.3s' }}>
              <ZoomIn size={28} color="white" />
            </Box>
          </Box>
        ))}
      </Box>

      <Dialog open={!!lightbox} onClose={() => setLightbox(null)} maxWidth={false}
        slotProps={{ paper: { sx: { bgcolor: 'transparent', boxShadow: 'none', overflow: 'visible' } } }}>
        <Box sx={{ position: 'relative' }}>
          <IconButton onClick={() => setLightbox(null)} sx={{ position: 'absolute', top: -16, right: -16, bgcolor: 'rgba(0,0,0,0.7)', zIndex: 1 }}>
            <X size={20} />
          </IconButton>
          {lightbox && <Box component="img" src={photoUrl(lightbox)} alt="" sx={{ maxWidth: '90vw', maxHeight: '90vh', borderRadius: 2, display: 'block' }} />}
        </Box>
      </Dialog>
    </Box>
  )
}

// ── Main Gallery ─────────────────────────────────────────────────────────────

export default function Gallery() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [selected, setSelected] = useState<Category | null>(null)
  const [heroSrc, setHeroSrc] = useState<string | null>(null)
  const [heroFading, setHeroFading] = useState(false)
  const heroPoolRef = useRef<string[]>([])

  useEffect(() => {
    fetch(`${API}/api/categories`)
      .then(r => r.json())
      .then((cats: Category[]) => {
        setCategories(cats)
        const thumbs = cats.filter(c => c.thumbnail).map(c => c.thumbnail!)
        heroPoolRef.current = thumbs
        if (thumbs.length) setHeroSrc(thumbs[Math.floor(Math.random() * thumbs.length)])
        setLoading(false)
      })
      .catch(() => { setError('Cannot reach photo API on port 8586.'); setLoading(false) })
  }, [])

  // Hero rotates every 15s too
  useEffect(() => {
    if (!heroPoolRef.current.length) return
    const t = setInterval(() => {
      setHeroFading(true)
      setTimeout(() => {
        const pool = heroPoolRef.current
        setHeroSrc(pool[Math.floor(Math.random() * pool.length)])
        setHeroFading(false)
      }, 700)
    }, ROTATE_MS)
    return () => clearInterval(t)
  }, [categories])

  if (loading) return <LoadingScreen message="Loading gallery" />
  if (error) return <Box sx={{ mt: 6, textAlign: 'center' }}><Typography color="error">{error}</Typography></Box>
  if (selected) return <DrillView cat={selected} onBack={() => setSelected(null)} />

  return (
    <Box>
      {/* Hero */}
      {heroSrc && (
        <Box sx={{ position: 'relative', height: 280, borderRadius: 4, overflow: 'hidden', mb: 4, border: '1px solid rgba(255,255,255,0.06)' }}>
          <Box component="img" src={photoUrl(heroSrc)} alt=""
            sx={{ width: '100%', height: '100%', objectFit: 'cover', transition: 'opacity 0.7s ease', opacity: heroFading ? 0 : 1 }} />
          <Box sx={{ position: 'absolute', inset: 0, background: 'linear-gradient(to bottom, transparent 40%, rgba(0,0,0,0.7) 100%)' }} />
          <Box sx={{ position: 'absolute', bottom: 24, left: 28 }}>
            <Typography variant="h4" sx={{ fontWeight: 700, color: 'white' }}>Family Gallery</Typography>
            <Typography color="rgba(255,255,255,0.6)">
              {categories.reduce((n, c) => n + c.count, 0)} photos across {categories.length} albums
            </Typography>
          </Box>
        </Box>
      )}

      {/* Category cards */}
      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 2 }}>
        {categories.map(cat => (
          <CategoryCard key={cat.id} cat={cat} onClick={() => setSelected(cat)} />
        ))}
      </Box>
    </Box>
  )
}
